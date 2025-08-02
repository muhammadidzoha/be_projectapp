import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export class ParentService {
  static async getQuisionerProgress(userId) {
    const user = await this.getUserWithFamily(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const quisionerProgress = await prisma.$queryRaw`
        SELECT fm.id AS familyId, fm.fullName, r.id AS response_id, u.id AS user_id FROM users u JOIN families f ON u.id =
        f.userId LEFT JOIN family_members fm ON fm.id = (SELECT id FROM family_members fm2 WHERE fm2.familyId = f.id ORDER BY fm2.createdAt ASC limit 1) JOIN responses r ON r.familyMemberId = fm.id RIGHT JOIN quesioners q ON q.id = r.quisionerId WHERE q.for = "PARENT" AND (u.id =  ${user.id} OR u.id IS NULL);
        `;

    const count = quisionerProgress.length;
    const answered = quisionerProgress.reduce((acc, current) => {
      if (!current.response_id) {
        return acc;
      }
      return acc + 1;
    }, 0);

    const progress = Math.round((answered / count) * 100);

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
    console.log({ sorted });
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

      console.log({ totalPercentage });
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
