import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { getInstitutionByUser } from "../helpers/InstitutionHelper.js";

const prisma = new PrismaClient();

const POINTS_RESIDENCE = {
  MILIK_SENDIRI: 3,
  MENYEWA: 2,
  BERSAMA_ORANG_TUA: 1,
};

const POINTS_CHILDREN = {
  SATU: 3,
  DUA_SAMPAI_TIGA: 2,
  EMPAT_ATAU_LEBIH: 1,
};

const POINTS_UNDER_FIVE = {
  TIDAK_ADA: 4,
  SATU: 3,
  DUA_SAMPAI_TIGA: 2,
  EMPAT_ATAU_LEBIH: 1,
};

const POINTS_INCOME = {
  KURANG_DARI_LIMA_JUTA: 1,
  LIMA_JUTA_SAMPAI_SEPULUH_JUTA: 2,
  LEBIH_DARI_SEPULUH_JUTA: 3,
};

const categorizeEducation = (edu) => {
  if (!edu) return null;
  const dasar = ["TIDAK_SEKOLAH", "SD", "SMP"];
  return dasar.includes(edu) ? "Dasar" : "Menengah-Tinggi";
};

const SOCIO_ECONOMIC_THRESHOLD = 8;

const QUESTIONNAIRE_THRESHOLDS = {
  "Kebiasaan Sehari-hari Anak": { min: 34, good: "Baik", bad: "Kurang Baik" },
  "Tingkat Pengetahuan Gizi Seimbang": { min: 13, good: "Baik", bad: "Kurang" },
};

export const getAdminDashboardSummary = async (req, res) => {
  try {
    const adminRole = await prisma.role.findUnique({
      where: { name: "admin" },
    });
    const adminRoleId = adminRole?.id ?? -1;

    const totalUsers = await prisma.user.count({
      where: { role_id: { not: adminRoleId } },
    });

    const usersByRole = await prisma.user.groupBy({
      by: ["role_id"],
      _count: { id: true },
    });
    const roles = await prisma.role.findMany();
    const roleMap = {};
    roles.forEach((r) => {
      roleMap[r.id] = r.name;
    });
    const userByRole = usersByRole
      .filter((u) => u.role_id !== adminRoleId)
      .map((u) => ({ role: roleMap[u.role_id], total: u._count.id }));

    const totalInstitutions = await prisma.institution.count();

    const instByType = await prisma.institution.groupBy({
      by: ["type"],
      _count: { id: true },
    });
    const instTypes = await prisma.institutionType.findMany();
    const instTypeMap = {};
    instTypes.forEach((t) => {
      instTypeMap[t.id] = t.name;
    });
    const institutionByType = instByType.map((i) => ({
      type: instTypeMap[i.type],
      total: i._count.id,
    }));

    const familyMembers = await prisma.familyMember.findMany({
      select: {
        nutrition: {
          select: { nutritionStatus: { select: { displayName: true } } },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
    const nutritionMap = {};
    familyMembers.forEach((fm) => {
      const name =
        fm.nutrition?.[0]?.nutritionStatus?.displayName || "Tidak Terdata";
      nutritionMap[name] = (nutritionMap[name] || 0) + 1;
    });
    const nutritionDistribution = Object.entries(nutritionMap).map(
      ([displayName, total]) => ({ displayName, total }),
    );

    const totalTeachers = await prisma.teacher.count();
    const totalClasses = await prisma.class.count();
    const totalRecommendations = await prisma.recommendation.count();

    const recByStatus = await prisma.recommendation.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    const statusLabelMap = {
      PENDING: "pending",
      PROCESSED: "proses",
      COMPLETED: "selesai",
    };
    const recommendationsByStatus = recByStatus.map((r) => ({
      status: statusLabelMap[r.status] || r.status.toLowerCase(),
      total: r._count.id,
    }));

    const schoolQuesioner = await prisma.quesioner.findFirst({
      where: { title: "Pelayanan Kesehatan Sekolah" },
    });

    const schools = await prisma.institution.findMany({
      where: { institution_type: { name: "School" } },
      select: { id: true, name: true },
    });

    const schoolResponses = await prisma.response.groupBy({
      by: ["institutionId"],
      where: {
        institutionId: { not: null },
        quisionerId: schoolQuesioner?.id ?? undefined,
      },
      _count: { id: true },
    });
    const responseMap = {};
    schoolResponses.forEach((r) => {
      if (r.institutionId) responseMap[r.institutionId] = r._count.id;
    });

    const institutionDetails = schools.map((s) => ({
      id: s.id,
      name: s.name,
      completedQuests: responseMap[s.id] || 0,
      totalQuests: schoolQuesioner ? 1 : 0,
    }));

    const completedInstitutions = institutionDetails.filter(
      (d) => d.completedQuests >= d.totalQuests,
    ).length;
    const totalSchoolInst = schools.length;
    const percentage =
      totalSchoolInst > 0
        ? Math.round((completedInstitutions / totalSchoolInst) * 100)
        : 0;

    const recentRecs = await prisma.recommendation.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        student: {
          include: {
            familyMember: { select: { fullName: true } },
            institution: { select: { name: true } },
          },
        },
      },
    });
    const recentRecommendations = recentRecs.map((r) => ({
      id: r.id,
      studentName: r.student.familyMember.fullName,
      institutionName: r.student.institution.name,
      status: statusLabelMap[r.status] || r.status.toLowerCase(),
      createdAt: r.createdAt,
    }));

    return successResponse(
      res,
      {
        totalUsers,
        userByRole,
        totalInstitutions,
        institutionByType,
        nutritionDistribution,
        totalTeachers,
        totalClasses,
        totalRecommendations,
        recommendationsByStatus,
        questionnaireProgress: {
          totalInstitutions: totalSchoolInst,
          completedInstitutions,
          percentage,
          institutionDetails,
        },
        recentRecommendations,
      },
      "Admin dashboard summary retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get admin dashboard summary");
  }
};

export const getParentDashboardSummary = async (req, res) => {
  try {
    const user = req.user;

    const family = await prisma.family.findUnique({
      where: { userId: user.id },
      include: {
        familyMember: {
          include: {
            nutrition: {
              include: {
                nutritionStatus: true,
                monitoringPeriod: { select: { label: true } },
              },
              orderBy: { measurementDate: "asc" },
            },
            SocioEconomic: true,
            student: true,
          },
        },
        monitoringPeriods: {
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!family) {
      return errorResponse(res, null, "Family not found");
    }

    const members = family.familyMember;
    const totalFamilyMembers = members.length;
    const children = members.filter((m) => m.relation === "ANAK");
    const totalChildren = children.length;

    const parent =
      members.find((m) => m.relation === "IBU") ||
      members.find((m) => m.relation === "AYAH");

    let totalQuestionnaires = 0;
    let answeredQuestionnaires = 0;
    let questionnaireProgress = 0;
    const questionnaireResults = [];

    const parentTitles = [
      "Tingkat Pengetahuan Gizi Seimbang",
      "Kebiasaan Sehari-hari Anak",
    ];

    if (parent) {
      totalQuestionnaires = await prisma.quesioner.count({
        where: { title: { in: parentTitles } },
      });

      const parentResponses = await prisma.response.findMany({
        where: { familyMemberId: parent.id },
        include: { quesioner: true },
      });

      answeredQuestionnaires = parentResponses.length;
      questionnaireProgress =
        totalQuestionnaires > 0
          ? Math.round((answeredQuestionnaires / totalQuestionnaires) * 100)
          : 0;

      for (const r of parentResponses) {
        const threshold = QUESTIONNAIRE_THRESHOLDS[r.quesioner.title];
        if (threshold) {
          questionnaireResults.push({
            quesionerId: r.quisionerId,
            title: r.quesioner.title,
            totalScore: r.totalScore,
            interpretation:
              r.totalScore >= threshold.min ? threshold.good : threshold.bad,
          });
        }
      }
    }

    let socioEconomic = null;
    if (parent?.SocioEconomic) {
      const se = parent.SocioEconomic;
      const residencePoints = POINTS_RESIDENCE[se.residenceStatus] ?? 0;
      const childrenPoints = POINTS_CHILDREN[se.childrenCount] ?? 0;
      const underFivePoints = POINTS_UNDER_FIVE[se.underFiveCount] ?? 0;
      const incomePoints = POINTS_INCOME[se.familyIncomeLevel] ?? 0;
      const totalScore =
        residencePoints + childrenPoints + underFivePoints + incomePoints;

      socioEconomic = {
        residenceStatus: se.residenceStatus,
        residencePoints,
        childrenCount: se.childrenCount,
        childrenPoints,
        underFiveCount: se.underFiveCount,
        underFivePoints,
        familyIncomeLevel: se.familyIncomeLevel,
        incomePoints,
        totalScore,
        interpretation:
          totalScore >= SOCIO_ECONOMIC_THRESHOLD ? "Menengah-Tinggi" : "Rendah",
      };
    }

    const parentEducation = {};
    const ibu = members.find((m) => m.relation === "IBU");
    const ayah = members.find((m) => m.relation === "AYAH");
    if (ibu)
      parentEducation.ibu = {
        education: ibu.education,
        category: categorizeEducation(ibu.education),
      };
    if (ayah)
      parentEducation.ayah = {
        education: ayah.education,
        category: categorizeEducation(ayah.education),
      };

    const latestNutrition = children
      .flatMap((c) => c.nutrition)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

    const nutritionDistribution = {};
    children.forEach((child) => {
      const status = child.nutrition?.[0]?.nutritionStatus?.displayName;
      if (status) {
        nutritionDistribution[status] =
          (nutritionDistribution[status] || 0) + 1;
      }
    });
    const nutritionDistArray = Object.entries(nutritionDistribution).map(
      ([displayName, total]) => ({ displayName, total }),
    );

    let schoolHealthService = null;
    const childWithSchool = children.find((c) => c.student?.schoolId);
    if (childWithSchool) {
      const schoolId = childWithSchool.student.schoolId;
      const schoolQuesioner = await prisma.quesioner.findFirst({
        where: { title: "Pelayanan Kesehatan Sekolah" },
      });
      if (schoolQuesioner) {
        const schoolResponse = await prisma.response.findFirst({
          where: { institutionId: schoolId, quisionerId: schoolQuesioner.id },
          orderBy: { created_at: "desc" },
        });
        if (schoolResponse) {
          const threshold = 17;
          schoolHealthService = {
            title: schoolQuesioner.title,
            totalScore: schoolResponse.totalScore,
            interpretation:
              schoolResponse.totalScore >= threshold ? "Tinggi" : "Rendah",
          };
        }
      }
    }

    const childrenNutritionHistory = children.map((child) => ({
      childId: child.id,
      childName: child.fullName,
      measurements: child.nutrition.map((n) => ({
        period: n.monitoringPeriod?.label ?? "-",
        measurementDate: n.measurementDate,
        height: n.height,
        weight: n.weight,
        bmi: n.bmi,
        nutritionStatus: n.nutritionStatus?.displayName ?? null,
      })),
    }));

    const monitoringPeriods =
      family.monitoringPeriods?.map((mp) => ({
        id: mp.id,
        label: mp.label,
        startDate: mp.startDate,
        endDate: mp.endDate,
      })) ?? [];

    return successResponse(
      res,
      {
        totalFamilyMembers,
        totalChildren,
        totalQuestionnaires,
        answeredQuestionnaires,
        questionnaireProgress,
        questionnaireResults,
        socioEconomic,
        parentEducation,
        latestNutritionStatus:
          latestNutrition?.nutritionStatus?.displayName ?? null,
        nutritionDistribution: nutritionDistArray,
        schoolHealthService,
        childrenNutritionHistory,
        monitoringPeriods,
      },
      "Dashboard summary retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get dashboard summary");
  }
};

export const getSchoolDashboardSummary = async (req, res) => {
  try {
    const user = req.user;

    const institution = await getInstitutionByUser(user.id, user.role);

    if (!institution) return errorResponse(res, null, "Institution not found");

    const institutionId = institution.id;

    const totalStudents = await prisma.student.count({
      where: { schoolId: institutionId },
    });
    const totalClasses = await prisma.class.count({
      where: { school_id: institutionId },
    });
    const totalTeachers = await prisma.teacher.count({
      where: { school_id: institutionId },
    });
    const totalPartners = await prisma.partnership.count({
      where: { schoolId: institutionId },
    });

    const students = await prisma.familyMember.findMany({
      where: { student: { schoolId: institutionId } },
      select: {
        nutrition: {
          select: { nutritionStatus: { select: { displayName: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const nutritionMap = {};
    students.forEach((fm) => {
      const name =
        fm.nutrition?.[0]?.nutritionStatus?.displayName || "Tidak Terdata";
      nutritionMap[name] = (nutritionMap[name] || 0) + 1;
    });
    const nutritionDistribution = Object.entries(nutritionMap).map(
      ([displayName, total]) => ({ displayName, total }),
    );

    const classGroups = await prisma.student.groupBy({
      by: ["classId"],
      where: { schoolId: institutionId },
      _count: { id: true },
    });
    const classIds = classGroups.map((g) => g.classId);
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true },
    });
    const classMap = {};
    classes.forEach((c) => {
      classMap[c.id] = c.name;
    });

    // QUESTIONNAIRE DATA — only Pelayanan Kesehatan Sekolah
    const schoolQuesioner = await prisma.quesioner.findFirst({
      where: { title: "Pelayanan Kesehatan Sekolah" },
    });

    let questionnaireProgress = 0;
    let questionnaireResult = null;
    let schoolConclusion = null;

    if (schoolQuesioner) {
      const response = await prisma.response.findFirst({
        where: {
          institutionId,
          quisionerId: schoolQuesioner.id,
        },
      });

      if (response) {
        questionnaireProgress = 100;

        const interpretation = response.totalScore >= 17 ? "Tinggi" : "Rendah";

        questionnaireResult = {
          title: schoolQuesioner.title,
          totalScore: response.totalScore,
          interpretation,
        };

        if (interpretation === "Tinggi") {
          schoolConclusion = {
            color: "from-emerald-500 to-teal-600",
            icon: "🏆",
            kategori: "Pelayanan Kesehatan Sekolah Baik",
            saran: ["Budayakan perilaku hidup sehat dalam lingkungan sekolah"],
          };
        } else {
          schoolConclusion = {
            color: "from-amber-500 to-orange-600",
            icon: "⚠️",
            kategori: "Pelayanan Kesehatan Sekolah Perlu Ditingkatkan",
            saran: [
              "Rekomendasi tindaklanjut Puskesmas",
              "Budayakan perilaku hidup sehat dalam lingkungan sekolah",
            ],
          };
        }
      }
    }

    return successResponse(
      res,
      {
        totalStudents,
        totalClasses,
        totalTeachers,
        totalPartners,
        nutritionDistribution,
        studentsPerClass: classGroups.map((g) => ({
          className: classMap[g.classId] || "Unknown",
          total: g._count.id,
        })),
        questionnaireProgress,
        questionnaireResult,
        schoolConclusion,
      },
      "School dashboard summary retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const getHealthcareDashboardSummary = async (req, res) => {
  try {
    const user = req.user;

    const institution = await getInstitutionByUser(user.id, user.role);

    if (!institution) return errorResponse(res, null, "Institution not found");

    const institutionId = institution.id;

    const [pending, processed, completed] = await Promise.all([
      prisma.recommendation.count({
        where: { healthcareInstitutionId: institutionId, status: "PENDING" },
      }),
      prisma.recommendation.count({
        where: { healthcareInstitutionId: institutionId, status: "PROCESSED" },
      }),
      prisma.recommendation.count({
        where: { healthcareInstitutionId: institutionId, status: "COMPLETED" },
      }),
    ]);

    const totalPartnerSchools = await prisma.partnership.count({
      where: { healthcareId: institutionId },
    });

    const recentRecs = await prisma.recommendation.findMany({
      where: { healthcareInstitutionId: institutionId, status: "PENDING" },
      select: {
        id: true,
        createdAt: true,
        student: {
          select: {
            nis: true,
            familyMember: {
              select: { fullName: true },
            },
            institution: {
              select: { name: true },
            },
            class: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recByStatus = [
      { status: "PENDING", total: pending },
      { status: "PROCESSED", total: processed },
      { status: "COMPLETED", total: completed },
    ];

    return successResponse(
      res,
      {
        totalPending: pending,
        totalProcessed: processed,
        totalCompleted: completed,
        totalPartnerSchools,
        recentRecommendations: recentRecs,
        recommendationsByStatus: recByStatus,
      },
      "Healthcare dashboard summary retrieved successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Failed to get healthcare dashboard summary",
    );
  }
};
