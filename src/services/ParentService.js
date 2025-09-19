import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export class ParentService {
  static async getQuisionerProgress(userId) {
    const user = await this.getUserWithFamily(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const quisionerProgress = await prisma.$queryRaw`
        SELECT
    u.id AS userId,
    f.id AS familyId,
    fm.id AS familyMemberId,
    fm.fullName,
    q.id AS quesionerId,
    q.title,
    r.id AS responseId
FROM
    users u
JOIN
    families f ON u.id = f.userId
JOIN
    family_members fm ON f.id = fm.familyId
JOIN
    responses r ON fm.id = r.familyMemberId
JOIN
    quesioners q ON r.quisionerId = q.id
WHERE
    u.id = ${user.id}
    AND q.for = "PARENT";
        `;

    const count = quisionerProgress.length;

    const total = await prisma.quesioner.findMany({
      where: {
        for: "PARENT",
      },
    });

    const progress = Math.round((count / total.length) * 100);

    return { progress };
  }

  static async getUserWithFamily(userId) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        family: {
          include: {
            familyMember: true,
          },
        },
      },
    });

    return user;
  }

  static async getMemberSummaryCount(userId) {
    const [
      familyMembers,
      needAttention,
      childNutritionGrowth,
      mappedNutritionResource,
    ] = await Promise.all([
      (
        await prisma.familyMember.findMany({
          where: {
            family: {
              userId: userId,
            },
          },
          include: {
            nutrition: {
              include: {
                nutritionStatus: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        })
      ).map((val) => ({
        ...val,
        nutrition: val.nutrition.map((nutrition) => ({
          ...nutrition,
          date: new Date(nutrition.createdAt).getDate(),
        })),
      })),

      await prisma.familyMember.findMany({
        where: {
          family: {
            userId,
          },
          relation: "ANAK",
        },
        select: {
          nutrition: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            where: {
              nutritionStatusId: {
                not: 3,
              },
            },
          },
          fullName: true,
          gender: true,
          birthDate: true,
          relation: true,
          education: true,
        },
      }),

      await prisma.familyMember.findMany({
        where: {
          family: {
            userId,
          },
          relation: "ANAK",
        },
        include: {
          nutrition: {
            include: {
              nutritionStatus: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          },
        },
      }),
      await this.getNutritionResource(),
    ]);

    const childrens = familyMembers.filter((val) => val.relation === "ANAK");

    const sorted = childNutritionGrowth.map((val) => ({
      ...val,
      nutrition: val.nutrition.sort((a, b) => a.createdAt - b.createdAt),
    }));
    return {
      familyCount: familyMembers.length,
      childCount: childrens.length,
      needAttention: needAttention,
      childrens,
      childNutritionGrowth: sorted,
      mappedNutritionResource,
    };
  }

  static async getNutritionResource() {
    const resourceKeys = [
      "Guru",
      "Puskesmas",
      "Keluarga",
      "UKS",
      "Posyandu",
      "Dinas Kesehatan",
    ];
    const rawNutritionsByRole = await prisma.$queryRaw`
    SELECT r.name, COUNT(n.id) AS resource_total FROM nutritions n JOIN users u ON n.createdBy = u.id JOIN roles r ON r.id = u.role_id GROUP BY r.name;
    `;
    1;

    const nutritionsByRole = rawNutritionsByRole.map((val) => ({
      ...val,
      resource_total: Number(val.resource_total),
    }));

    const resourcesTotal = nutritionsByRole.reduce((returnVal, current) => {
      const total = +current.resource_total.toString();
      return returnVal + total;
    }, 0);

    const mappedNutritionResource = nutritionsByRole.map((val) => {
      const resourceCount = +val.resource_total.toString();
      const totalPercentage = Math.floor(
        (resourceCount / resourcesTotal) * 100
      );

      let total = 0;
      if (totalPercentage < 33) {
        total = 1;
      } else if (totalPercentage < 66) {
        total = 2;
      } else {
        total = 3;
      }

      switch (val.name) {
        case "parent":
          return {
            name: "Keluarga",
            total,
          };
        case "teacher":
          return {
            name: "Guru",
            total,
          };
        case "healthcare":
          return {
            name: "Puskesmas",
            total,
          };
        case "school":
          return {
            name: "Sekolah",
            total,
          };
        default:
          return val;
      }
    });

    const resourceNutrition = resourceKeys.reduce((returnVal, current) => {
      const isKeyExist = returnVal.findIndex((val) => val.name === current);
      if (isKeyExist < 0) {
        returnVal.push({
          name: current,
          total: 0,
        });
      }
      return returnVal;
    }, mappedNutritionResource);

    return resourceNutrition;
  }
}
