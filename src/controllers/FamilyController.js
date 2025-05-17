import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getFamily = async (req, res) => {
  try {
    const family = await prisma.family.findMany({
      select: {
        id: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    return successResponse(res, family, "Family retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve family");
  }
};

export const getFamilyMemberByUser = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const user = req.user;

    const family = await prisma.family.findMany({
      where: {
        userId: user.id,
      },
    });

    if (!family) {
      return errorResponse(res, null, "Family not found");
    }

    const totalRows = await prisma.familyMember.count({
      where: {
        familyId: {
          in: family.map((family) => family.id),
        },
        OR: [
          {
            fullName: {
              contains: search,
            },
          },
        ],
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const familyMembers = await prisma.familyMember.findMany({
      where: {
        familyId: {
          in: family.map((family) => family.id),
        },
        OR: [
          {
            fullName: {
              contains: search,
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        education: true,
        gender: true,
        relation: true,
        phone: true,
        job: {
          select: {
            id: true,
            income: true,
            jobType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        residence: {
          select: {
            id: true,
            status: true,
            address: true,
          },
        },
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
              },
            },
          },
        },
        isCompleted: true,
      },
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, familyMembers },
      "Family Member retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve family member");
  }
};

export const createFamilyMember = async (req, res) => {
  try {
    const user = req.user;
    let members = req.body;

    if (!Array.isArray(members)) {
      members = [members];
    }

    const familyByUser = await prisma.family.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!familyByUser) {
      return errorResponse(res, null, "Family not found");
    }

    const results = [];

    for (const member of members) {
      const {
        type,
        fullName,
        birthDate,
        education,
        jobTypeId,
        income,
        height,
        weight,
        gender,
        relation,
        institutionId,
        phone,
        status,
        address,
        nis,
        schoolYear,
        semester,
        schoolId,
        birthWeight,
        classId,
        sameHome,
      } = member;

      const now = new Date();
      const validBirthDate = new Date(
        `${birthDate}T${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}Z`
      );

      const heightInMeters = Number(height) / 100;
      const calculateBMI = Number(weight) / (heightInMeters * heightInMeters);

      let bmiCategory = "";
      if (calculateBMI < 17) {
        bmiCategory = "Kekurangan bb tingkat berat";
      } else if (calculateBMI >= 17 && calculateBMI < 18.5) {
        bmiCategory = "Kekurangan bb tingkat ringan";
      } else if (calculateBMI >= 18.5 && calculateBMI <= 24.9) {
        bmiCategory = "Gizi normal";
      } else if (calculateBMI > 24.9 && calculateBMI <= 27) {
        bmiCategory = "Kelebihan bb tingkat ringan";
      } else {
        bmiCategory = "Kelebihan bb tingkat berat";
      }

      const nutritionStatus = await prisma.nutritionStatus.findFirst({
        where: {
          information: bmiCategory,
        },
      });

      if (!nutritionStatus) {
        results.push({ error: "Nutrition status not found", member });
        continue;
      }

      let job, residence, familyMember, nutrition, student, parent;

      if (type === "ibu") {
        [job, residence] = await prisma.$transaction([
          prisma.job.create({
            data: {
              income,
              jobTypeId,
            },
          }),
          prisma.residence.create({
            data: {
              status,
              address,
            },
          }),
        ]);

        familyMember = await prisma.familyMember.create({
          data: {
            fullName,
            birthDate: validBirthDate,
            education,
            gender,
            relation,
            familyId: familyByUser.id,
            institutionId,
            phone,
            jobId: job.id,
            residenceId: residence.id,
          },
        });

        nutrition = await prisma.nutrition.create({
          data: {
            height: Number(height),
            weight: Number(weight),
            bmi: calculateBMI,
            nutritionStatusId: nutritionStatus.id,
            familyMemberId: familyMember.id,
            createdBy: user.id,
          },
        });
      } else if (type === "ayah") {
        let ibuResidenceId = null;
        if (sameHome) {
          const ibu = await prisma.familyMember.findFirst({
            where: {
              familyId: familyByUser.id,
              relation: "IBU",
            },
            select: { residenceId: true },
          });
          ibuResidenceId = ibu?.residenceId;
          job = await prisma.job.create({
            data: {
              income,
              jobTypeId,
            },
          });
        } else {
          [job, residence] = await prisma.$transaction([
            prisma.job.create({
              data: {
                income,
                jobTypeId,
              },
            }),
            prisma.residence.create({
              data: {
                status,
                address,
              },
            }),
          ]);
        }

        familyMember = await prisma.familyMember.create({
          data: {
            fullName,
            birthDate: validBirthDate,
            education,
            gender,
            relation,
            familyId: familyByUser.id,
            institutionId,
            phone,
            jobId: job.id,
            residenceId: sameHome ? ibuResidenceId : residence.id,
          },
        });

        nutrition = await prisma.nutrition.create({
          data: {
            height: Number(height),
            weight: Number(weight),
            bmi: calculateBMI,
            nutritionStatusId: nutritionStatus.id,
            familyMemberId: familyMember.id,
            createdBy: user.id,
          },
        });
      } else if (type === "anak") {
        parent = await prisma.familyMember.findFirst({
          where: {
            familyId: familyByUser.id,
            OR: [{ relation: "IBU" }, { relation: "AYAH" }],
          },
          select: {
            residenceId: true,
          },
        });

        if (!parent || !parent.residenceId) {
          results.push({ error: "Parent residence not found", member });
          continue;
        }

        familyMember = await prisma.familyMember.create({
          data: {
            fullName,
            birthDate: validBirthDate,
            education,
            gender,
            relation,
            familyId: familyByUser.id,
            institutionId,
            phone,
            residenceId: parent.residenceId,
          },
        });

        student = await prisma.student.create({
          data: {
            nis,
            schoolYear,
            semester,
            schoolId,
            classId,
            familyMemberId: familyMember.id,
          },
        });

        nutrition = await prisma.nutrition.create({
          data: {
            height: Number(height),
            weight: Number(weight),
            birthWeight: Number(birthWeight),
            bmi: calculateBMI,
            nutritionStatusId: nutritionStatus.id,
            familyMemberId: familyMember.id,
            createdBy: user.id,
          },
        });
      } else {
        results.push({ error: "Invalid type", member });
        continue;
      }

      results.push({ job, residence, familyMember, nutrition, student });
    }

    const ibu = await prisma.familyMember.findFirst({
      where: { familyId: familyByUser.id, relation: "IBU" },
    });
    const ayah = await prisma.familyMember.findFirst({
      where: { familyId: familyByUser.id, relation: "AYAH" },
    });
    const anak = await prisma.familyMember.findFirst({
      where: { familyId: familyByUser.id, relation: "ANAK" },
    });

    if (ibu && ayah && anak) {
      await prisma.familyMember.updateMany({
        where: {
          familyId: familyByUser.id,
          relation: { in: ["IBU", "AYAH", "ANAK"] },
        },
        data: { isCompleted: true },
      });
    }

    return successResponse(
      res,
      results,
      "Berhasil menambahkan anggota keluarga"
    );
  } catch (error) {
    return errorResponse(res, error, "Gagal menambahkan anggota keluarga");
  }
};
