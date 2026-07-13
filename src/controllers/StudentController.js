import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { getInstitutionByUser } from "../helpers/InstitutionHelper.js";

const prisma = new PrismaClient();

// ---- constants for conclusion computation ----

const SOCIO_ECONOMIC_POINTS = {
  residence: { MILIK_SENDIRI: 3, MENYEWA: 2, BERSAMA_ORANG_TUA: 1 },
  children: { SATU: 3, DUA_SAMPAI_TIGA: 2, EMPAT_ATAU_LEBIH: 1 },
  underFive: { TIDAK_ADA: 4, SATU: 3, DUA_SAMPAI_TIGA: 2, EMPAT_ATAU_LEBIH: 1 },
  income: {
    KURANG_DARI_LIMA_JUTA: 1,
    LIMA_JUTA_SAMPAI_SEPULUH_JUTA: 2,
    LEBIH_DARI_SEPULUH_JUTA: 3,
  },
};

const SOCIO_ECONOMIC_THRESHOLD = 8;
const QUESTIONNAIRE_PARENT_THRESHOLDS = {
  "Kebiasaan Sehari-hari Anak": 34,
  "Tingkat Pengetahuan Gizi Seimbang": 13,
};

const SCHOOL_HEALTH_THRESHOLD = 17;

const categorizeEducation = (edu) => {
  if (!edu) return "Dasar";
  return ["TIDAK_SEKOLAH", "SD", "SMP"].includes(edu)
    ? "Dasar"
    : "Menengah-Tinggi";
};

const computeSocioEconomicInterpretation = (se) => {
  if (!se) return null;
  const totalScore =
    (SOCIO_ECONOMIC_POINTS.residence[se.residenceStatus] ?? 0) +
    (SOCIO_ECONOMIC_POINTS.children[se.childrenCount] ?? 0) +
    (SOCIO_ECONOMIC_POINTS.underFive[se.underFiveCount] ?? 0) +
    (SOCIO_ECONOMIC_POINTS.income[se.familyIncomeLevel] ?? 0);
  return totalScore >= SOCIO_ECONOMIC_THRESHOLD ? "Menengah-Tinggi" : "Dasar";
};

const computeConclusion = (
  nutritionStatus,
  parentData,
  schoolHealthInterpretation,
) => {
  if (!nutritionStatus) return null;

  if (nutritionStatus === "OVERWEIGHT-OBESITAS") return "Gizi Lebih";
  if (nutritionStatus === "GIZI BURUK-KURANG")
    return "Tidak Berisiko Gizi Lebih";

  if (nutritionStatus === "GIZI BAIK") {
    const kebiasaanBaik =
      (parentData?.kebiasaanScore ?? 0) >=
      QUESTIONNAIRE_PARENT_THRESHOLDS["Kebiasaan Sehari-hari Anak"];
    const pengetahuanBaik =
      (parentData?.pengetahuanScore ?? 0) >=
      QUESTIONNAIRE_PARENT_THRESHOLDS["Tingkat Pengetahuan Gizi Seimbang"];
    const sosialEkonomiBaik =
      parentData?.socioEconomicInterpretation === "Menengah-Tinggi";
    const pendidikanBaik = parentData?.parentEducation === "Menengah-Tinggi";
    const pelkesBaik = schoolHealthInterpretation === "Tinggi";

    const all5Good =
      kebiasaanBaik &&
      pengetahuanBaik &&
      sosialEkonomiBaik &&
      pendidikanBaik &&
      pelkesBaik;

    if (all5Good) return "Tidak Berisiko Gizi Lebih";

    const triggerBad = !kebiasaanBaik || !pengetahuanBaik || !sosialEkonomiBaik;
    if (triggerBad) return "Berisiko Gizi Lebih";

    return "Tidak Berisiko Gizi Lebih";
  }

  return null;
};

// ---- existing controller functions ----

export const getStudents = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.familyMember.count({
      where: {
        relation: "ANAK",
        education: "SD",
        fullName: {
          contains: search,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const students = await prisma.familyMember.findMany({
      where: {
        relation: "ANAK",
        education: "SD",
        fullName: {
          contains: search,
        },
      },
      select: {
        id: true,
        fullName: true,
        nutrition: {
          select: {
            id: true,
            height: true,
            weight: true,
            bmi: true,
            nutritionStatus: {
              select: {
                id: true,
                information: true,
                displayName: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            nis: true,
            schoolYear: true,
            semester: true,
            institution: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                province: {
                  select: { id: true, name: true },
                },
                city: {
                  select: { id: true, name: true },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                teacher: {
                  select: {
                    id: true,
                    fullName: true,
                    address: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: {
        id: "asc",
      },
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, students },
      "Students retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve students");
  }
};

export const getStudentByUser = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;
  const filteredClass = req.query.class || "";

  try {
    const user = req.user;
    if (!user || !["school", "teacher"].includes(user.role)) {
      return errorResponse(
        res,
        404,
        "User not found or not associated with an institution",
      );
    }

    const institution = await getInstitutionByUser(user.id, user.role);

    if (!institution) {
      return errorResponse(res, 404, "Institution not found for this user");
    }

    const totalRows = await prisma.familyMember.count({
      where: {
        fullName: {
          contains: search,
        },
        student: {
          institution: {
            id: institution.id,
          },
          ...(filteredClass && {
            class: {
              name: filteredClass,
            },
          }),
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const students = await prisma.familyMember.findMany({
      where: {
        fullName: {
          contains: search,
        },
        student: {
          institution: {
            id: institution.id,
          },
          ...(filteredClass && {
            class: {
              name: filteredClass,
            },
          }),
        },
      },
      select: {
        id: true,
        fullName: true,
        familyId: true,
        nutrition: {
          select: {
            id: true,
            height: true,
            weight: true,
            bmi: true,
            nutritionStatus: {
              select: {
                id: true,
                information: true,
                displayName: true,
              },
            },
            measurementDate: true,
            monitoringPeriod: {
              select: {
                label: true,
              }
            }
          },
        },
        student: {
          select: {
            id: true,
            nis: true,
            schoolYear: true,
            semester: true,
            institution: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                province: {
                  select: { id: true, name: true },
                },
                city: {
                  select: { id: true, name: true },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                teacher: {
                  select: {
                    id: true,
                    fullName: true,
                    address: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: {
        id: "asc",
      },
    });

    const studentIds = students.map((s) => s.student?.id).filter(Boolean);

    let activeRecStudentIds = new Set();
    let completedRecMap = {};
    if (studentIds.length > 0) {
      const recs = await prisma.recommendation.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true, studentId: true, status: true },
      });
      activeRecStudentIds = new Set(
        recs
          .filter((r) => r.status === "PENDING" || r.status === "PROCESSED")
          .map((r) => r.studentId),
      );
      for (const r of recs) {
        if (r.status === "COMPLETED") {
          completedRecMap[r.studentId] = { id: r.id, status: r.status };
        }
      }
    }

    // Ganti mapping jadi tambah completedRecommendation:
    const studentsWithFlag = students.map((s) => ({
      ...s,
      isRecommending: s.student ? activeRecStudentIds.has(s.student.id) : false,
      completedRecommendation: s.student
        ? completedRecMap[s.student.id] || null
        : null,
    }));

    // ---- compute conclusion per student ----

    const familyIds = [
      ...new Set(studentsWithFlag.map((s) => s.familyId).filter(Boolean)),
    ];

    const familyConclusionMap = {};
    if (familyIds.length > 0) {
      const families = await prisma.family.findMany({
        where: { id: { in: familyIds } },
        select: {
          id: true,
          familyMember: {
            where: { relation: { in: ["AYAH", "IBU"] } },
            select: {
              education: true,
              SocioEconomic: true,
              Response: {
                select: {
                  totalScore: true,
                  quesioner: { select: { title: true } },
                },
              },
            },
          },
        },
      });

      for (const fam of families) {
        const parent = fam.familyMember[0];
        if (!parent) {
          familyConclusionMap[fam.id] = null;
          continue;
        }

        const qMap = {};
        for (const r of parent.Response || []) {
          qMap[r.quesioner.title] = r.totalScore;
        }

        familyConclusionMap[fam.id] = {
          socioEconomicInterpretation: computeSocioEconomicInterpretation(
            parent.SocioEconomic,
          ),
          parentEducation: categorizeEducation(parent.education),
          kebiasaanScore: qMap["Kebiasaan Sehari-hari Anak"],
          pengetahuanScore: qMap["Tingkat Pengetahuan Gizi Seimbang"],
        };
      }
    }

    // School health service (same for all students in this school)
    let schoolHealthInterpretation = "Rendah";
    const healthQuesioner = await prisma.quesioner.findFirst({
      where: { title: "Pelayanan Kesehatan Sekolah" },
    });
    if (healthQuesioner) {
      const healthResponse = await prisma.response.findFirst({
        where: {
          institutionId: institution.id,
          quisionerId: healthQuesioner.id,
        },
        orderBy: { created_at: "desc" },
      });
      if (
        healthResponse &&
        (healthResponse.totalScore ?? 0) >= SCHOOL_HEALTH_THRESHOLD
      ) {
        schoolHealthInterpretation = "Tinggi";
      }
    }

    const studentsWithConclusion = studentsWithFlag.map((s) => {
      const nutritionStatus = s.nutrition?.[0]?.nutritionStatus?.displayName;
      const conclusion = computeConclusion(
        nutritionStatus,
        familyConclusionMap[s.familyId],
        schoolHealthInterpretation,
      );
      const { familyId, ...rest } = s;
      return { ...rest, conclusion };
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, students: studentsWithConclusion },
      "Students retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve students");
  }
};
