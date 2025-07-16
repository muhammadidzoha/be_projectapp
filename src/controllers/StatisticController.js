import { serializeJsonQuery } from "@prisma/client/runtime/library";
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
      const user = req.user;
      const data = await prisma.nutrition.findMany({
        orderBy: [
          {
            createdBy: "desc",
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
          },
        },
        include: {
          familyMember: {
            select: {
              fullName: true,
            },
          },
        },
        take: 10,
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

const getUserInstitution = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      institution: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user.institution?.id;
};

export const schoolStatisticController = {
  getEachInterventionStatusCount: async (req, res) => {
    try {
      const user = req.user;
      const thirtyDayAgo = new Date();
      thirtyDayAgo.setDate(new Date().getDate() - 30);
      const institutionId = await getUserInstitution(user.id);
      const statusCount = await prisma.recommendation.groupBy({
        by: ["status"],
        _count: { status: true },
        where: {
          submittedBy: {
            institution: {
              id: institutionId,
            },
          },
          createdAt: {
            gt: thirtyDayAgo,
          },
        },
      });

      res.status(200).json({
        status: "Success",
        message: "Data didapatkan",
        data: statusCount.map((val) => ({
          status: val.status,
          total: val._count.status,
        })),
      });
    } catch (err) {
      return errorResponse(res, err, "Gagal mendapatkan status intervensi");
    }
  },

  getTotalRecommendationAndIntervention: async (req, res) => {
    try {
      const user = req.user;

      const userInstitutionId = await getUserInstitution(user.id);

      const recommendationTotal = await prisma.recommendation.count({
        where: {
          submittedBy: {
            institution: {
              id: userInstitutionId,
            },
          },
        },
      });

      const interventionTotal = await prisma.$queryRaw`
        SELECT DISTINCT r.id FROM interventions i JOIN recommendations r ON i.recommendationId = r.id JOIN users u ON r.submittedById = u.id JOIN institutions it ON u.id = it.user_id WHERE it.id = ${userInstitutionId}
      `;

      res.status(200).json({
        status: "Success",
        message: "Berhasil mendapatkan data",
        data: {
          recommendationTotal,
          interventionTotal: interventionTotal.length ?? 0,
        },
      });
    } catch (err) {
      return errorResponse(res, err, "Gagal saat mendapatkan data");
    }
  },

  getDemografiDistribution: async (req, res) => {
    try {
      const educationDistribution = await prisma.$queryRaw`
        SELECT education, COUNT(education) as total FROM family_members fm GROUP BY education  
      `;

      const jobDistribution = await prisma.$queryRaw`
        SELECT jt.name, COUNT(j.jobTypeId) as total FROM jobs j JOIN job_types jt ON j.jobTypeId = jt.id GROUP BY jt.name
      `;

      console.log({ educationDistribution, jobDistribution });

      res.status(200).json({
        status: "Success",
        message: "Berhasil mendapatkan data",
        data: {
          educationDistribution: educationDistribution.map((val) => ({
            ...val,
            total: +val.total.toString(),
          })),
          jobDistribution: jobDistribution.map((val) => ({
            ...val,
            total: +val.total.toString(),
          })),
        },
      });
    } catch (err) {
      return errorResponse(res, err, "Gagal mendapatkan data");
    }
  },

  getTotalStudentWithNutritionProblem: async (req, res) => {
    try {
      const user = req.user;
      const userInstitutionId = await getUserInstitution(user.id);
      const data = await prisma.$queryRaw`
        SELECT c.name, COUNT(s.id) as total_student, COUNT(n.id) as student_with_problem_total 
        FROM students s JOIN classes c ON s.classId = c.id
        JOIN family_members fm ON fm.id = s.familyMemberId
        LEFT JOIN nutritions n ON fm.id = n.familyMemberId
        JOIN nutrition_status ns ON  ns.id = n.nutritionStatusId 
        WHERE schoolId = ${userInstitutionId} AND n.nutritionStatusId != 3  GROUP BY s.classId
      `;
      console.log({ data });
      res.json({
        status: "Success",
        message: "Berhasil mendapatkan data",
        data: data.map((val) => ({
          ...val,
          total_student: +val.total_student.toString(),
          student_with_problem_total:
            +val.student_with_problem_total.toString(),
        })),
      });
    } catch (err) {
      return errorResponse(res, err, "Gagal mendapatkan data");
    }
  },

  getUnfilledQuisionerFamilyCount: async (req, res) => {
    try {
      const user = req.user;
      const userInstitutionId = getUserInstitution(user.id);
      const unfilledQuisionerFamilyCount = await prisma.$queryRaw`
        SELECT COUNT(*) as unfilled_family_quisioner FROM families f JOIN users u ON f.userId = u.id JOIN family_members fm ON fm.id = (SELECT id FROM family_members fm2 WHERE fm2.familyId = f.id ORDER BY fm2.createdAt ASC limit
      1) LEFT JOIN responses r ON r.familyMemberId = fm.id WHERE r.familyMemberId IS NULL;
      `;
      console.log({ unfilledQuisionerFamilyCount });
      res.status(200).json({
        status: "Success",
        message: " Berhasil mendapatkan data",
        data:
          +unfilledQuisionerFamilyCount[0]?.unfilled_family_quisioner?.toString() ??
          0,
      });
    } catch (err) {
      return errorResponse(res, err, "Gagal mendapatkan data");
    }
  },

  getTotalStudent: async (req, res) => {
    try {
      const user = req.user;
      const userInstitutionId = await getUserInstitution(user.id);
      const studentCount = await prisma.student.count({
        where: {
          schoolId: userInstitutionId,
        },
      });

      res.status(200).json({
        status: "Success",
        message: "Data berhasil didapatkan",
        data: studentCount,
      });
    } catch (err) {
      return errorResponse(res, err, "Gagal mendapatkan data");
    }
  },

  getTotalTeacher: async (req, res) => {
    try {
      const user = req.user;
      const userInstitutionId = await getUserInstitution(user.id);
      const teacherCount = await prisma.teacher.count({
        where: {
          school_id: userInstitutionId,
        },
      });

      res.status(200).json({
        status: "Success",
        message: "Data total guru didapatkan",
        data: teacherCount,
      });
    } catch (err) {
      return errorResponse(res, err, "Gagal mendapatkan data");
    }
  },
};

export const puskesmasStatisticController = {
  // getRecommendationStatus: async (req, res) => {
  //   try{
  //     const interventionStatusCount = await prisma.$queryRaw`
  //     `
  //   }catch(err) {
  //     return errorResponse(res, err, "Gagal mendapatkan data");
  //   }
  // }

  getTotalInterventions: async (req, res) => {
    try {
      const user = req.user;
      const userInstitutionId = getUserInstitution(user.id);
      const interventions = await prisma.$queryRaw`
        SELECT CASE
          WHEN DAY(i.createdAt) > 0 THEN 1
          WHEN DAY(i.createdAt) > 7 THEN 2
          WHEN DAY(i.createdAt) > 14 THEN 3
          ELSE 4
          END AS week, COUNT(i.id) as total_intervention FROM interventions i JOIN users u ON i.user_id = u.id JOIN institutions ins ON ins.user_Id = u.id WHERE ins.id = ${userInstitutionId}  GROUP BY week ORDER BY week ASC
      `;

      res.status(200).json({
        status: "Success",
        message: "Berhasil mendapatkan data",
        data: interventions,
      });
    } catch (err) {
      return errorResponse(res, err);
    }
  },

  getNutritionDistributionBySchool: async (req, res) => {
    try {
      const nutritionDistribution = await prisma.$queryRaw`
       SELECT ins.id, ins.name, ns.status as status_gizi, COUNT(ns.id) AS total FROM nutritions n JOIN (SELECT familyMemberId, MAX(createdAt) AS createdAt FROM nutritions GROUP BY familyMemberId) as latest_n ON latest_n.familyMemberId = n.familyMemberId AND latest_n.createdAt = n.createdAt JOIN nutrition_status ns ON n.nutritionStatusId = ns.id JOIN family_members fm ON fm.id = n.familyMemberId JOIN students s ON s.familyMemberId = fm.id JOIN institutions ins ON ins.id = s.schoolId GROUP BY ins.id, ns.id
      `;

      const groupedData = nutritionDistribution.reduce((acc, current, i) => {
        let key = current["id"];

        if (acc.length === 0) {
          acc.push({
            [key]: [],
          });
        }

        for (let x = 0; x < acc.length; x++) {
          if (!acc[x][key]) {
            acc.push({
              [key]: [],
            });
          }

          acc[x][key].push({
            ...current,
            total: +current.total.toString(),
          });
        }

        return acc;
      }, []);
      res.status(200).json({
        status: "Success",
        message: "Berhasil mendapatkan data",
        data: groupedData,
      });
    } catch (err) {
      return errorResponse(res, err);
    }
  },

  getNutritionDistributionBySchoolAndAge: async (req, res) => {
    try {
      const nutritionDistribution = await prisma.$queryRaw`
       SELECT ins.id, ins.name, ns.status as status_gizi, TIMESTAMPDIFF(YEAR, fm.birthDate, NOW()) AS age ,COUNT(ns.id) AS total FROM nutritions n JOIN (SELECT familyMemberId, MAX(createdAt) AS createdAt FROM nutritions GROUP BY familyMemberId) as latest_n ON latest_n.familyMemberId = n.familyMemberId AND latest_n.createdAt = n.createdAt JOIN nutrition_status ns ON n.nutritionStatusId = ns.id JOIN family_members fm ON fm.id = n.familyMemberId JOIN students s ON s.familyMemberId = fm.id JOIN institutions ins ON ins.id = s.schoolId GROUP BY ins.id, ns.id, TIMESTAMPDIFF(YEAR, fm.birthDate, NOW())
      `;

      const groupedData = nutritionDistribution.reduce((acc, current, i) => {
        let key = current["id"];

        if (acc.length === 0) {
          acc.push({
            [key]: [],
          });
        }

        for (let x = 0; x < acc.length; x++) {
          if (!acc[x][key]) {
            acc.push({
              [key]: [],
            });
          }

          acc[x][key].push({
            ...current,
            total: +current.total.toString(),
          });
        }

        return acc;
      }, []);
      res.status(200).json({
        status: "Success",
        message: "Berhasil mendapatkan data",
        data: groupedData,
      });
    } catch (err) {
      return errorResponse(res, err);
    }
  },

  getAvgResponseScoreByCategory: async (req, res) => {
    try {
      const avgScore = await prisma.$queryRaw`
        SELECT q.id, q.title, AVG(r.totalScore) AS avg_score FROM responses r JOIN quesioners q ON q.id = r.quisionerId JOIN family_members fm ON fm.id = r.familyMemberId WHERE fm.institutionId IS NULL  GROUP BY q.id;
      `;

      res.status(200).json({
        status: "Success",
        message: "Berhasil mendapatkan data",
        data: avgScore,
      });
    } catch (err) {
      return errorResponse(res, err);
    }
  },
};
