import { errorResponse } from "../helpers/ResponseHelper.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "error"],
  errorFormat: "pretty",
});

export const parentStatisticController = {
  getEachStatisticCount: async (req, res) => {
    try {
      const user = req.user;
      const data = await prisma.$queryRaw`
        SELECT ns.status, COUNT(*) AS total FROM nutritions n JOIN nutrition_status ns ON n.nutritionStatusId = ns.id JOIN family_members fm ON n.familyMemberId = fm.id JOIN families f ON fm.familyId = f.id JOIN users u ON f.userId = u.id WHERE u.id = ${user.id} GROUP BY ns.status
      `;

      res.status(200).json({
        status: "Success",
        message: "Data nutrisi didapatkan",
        data: data.map((val) => ({
          ...val,
          total: +val.total.toString(),
        })),
      });
    } catch (err) {
      return errorResponse(res, err, "Terjadi kesalahan saat mengambil data");
    }
  },

  getChildNutritionGrowthLastTwoWeek: async (req, res) => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 14);
      const user = req.user;
      const data = await prisma.nutrition.findMany({
        orderBy: [
          {
            createdBy: "asc",
          },
          {
            familyMember: {
              createdAt: "asc",
            },
          },
        ],
        where: {
          familyMember: {
            family: {
              user: {
                id: user.id,
              },
            },
            relation: "ANAK",
            createdAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
        include: {
          familyMember: {
            select: {
              fullName: true,
            },
          },
        },
      });

      const groupedData = data.reduce((acc, current) => {
        const key = current.familyMember.fullName;

        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(current);

        return acc;
      }, {});

      const returnedData = Object.entries(groupedData).map(([key, val]) => ({
        children: key,
        val,
      }));

      res.status(200).json({
        status: "Success",
        message: "Data Perkembangan Anak Berhasil Didapatkan",
        data: returnedData,
      });
    } catch (err) {
      return errorResponse(res, err, "Terjadi kesalahan saat mengambil data");
    }
  },

  getInterventionCount: async (req, res) => {
    try {
      const user = req.user;
      const data = await prisma.intervention.findMany({
        where: {
          recommendation: {
            student: {
              familyMember: {
                family: {
                  user: {
                    id: user.id,
                  },
                },
              },
            },
          },
          forType: "PARENT",
        },
      });

      res.status(200).json({
        status: "Success",
        message: "Data nutrisi didapatkan",
        data: data?.length ?? 0,
      });
    } catch (err) {
      return errorResponse(res, err, "Terjadi kesalahan saat mengambil data");
    }
  },

  getQuisionerStatus: async (req, res) => {
    try {
      const user = req.user;

      const data = await prisma.response.findMany({
        where: {
          familyMember: {
            family: {
              user: {
                id: user.id,
              },
            },
          },
        },
        include: {
          quesioner: true,
        },
      });

      const returnedData = data.map((val) => ({
        ...val,
        quisionerId: val.quisionerId,
        title: val.quesioner.title,
      }));

      res.status(200).json({
        status: "Success",
        message: "Data nutrisi didapatkan",
        data: returnedData,
      });
    } catch (err) {
      return errorResponse(res, err, "Terjadi kesalahan saat mengambil data");
    }
  },
};
