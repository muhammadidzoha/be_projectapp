import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getRecomendations = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const offset = limit * page;

  try {
    const totalRows = await prisma.recommendation.count();

    const recomend = await prisma.recommendation.findMany({
      select: {
        id: true,
        status: true,
        createdAt: true,
        submittedBy: {
          select: {
            id: true,
            institution: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                city: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                province: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
                city: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                province: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
              },
            },
            familyMember: {
              select: {
                id: true,
                fullName: true,
                birthDate: true,
                gender: true,
                residence: {
                  select: {
                    id: true,
                    address: true,
                  },
                },
                nutrition: {
                  select: {
                    id: true,
                    nutritionStatus: {
                      select: {
                        id: true,
                        information: true,
                      },
                    },
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
        createdAt: "asc",
      },
    });

    const totalPage = Math.ceil(totalRows / limit);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, recomend },
      "List of recommendations retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const createRecommendation = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "school") {
      return errorResponse(
        res,
        403,
        "User is not associated with an institution"
      );
    }

    const { familyMemberId, studentId } = req.body;
    if (!familyMemberId) {
      return errorResponse(res, 400, "familyMemberId is required");
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        familyMemberId,
      },
    });

    if (!student) {
      return errorResponse(res, 404, "Student (anak) not found");
    }

    const existing = await prisma.recommendation.findFirst({
      where: {
        studentId: student.id,
        status: { in: ["PENDING", "PROCESSED"] },
      },
    });

    if (existing) {
      return errorResponse(
        res,
        400,
        "Murid ini sudah direkomendasikan sebelumnya"
      );
    }

    const recommendation = await prisma.recommendation.create({
      data: {
        studentId: student.id,
        submittedById: user.id,
        status: "PENDING",
      },
    });

    return successResponse(
      res,
      recommendation,
      "Recommendation created successfully"
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, error, "Failed to create recommendation");
  }
};

export const changeStatusToProcessed = async (req, res) => {
  const { id } = req.params;

  try {
    const data = await prisma.recommendation.update({
      where: {
        id,
      },
      data: {
        status: "PROCESSED",
      },
    });
    return successResponse(
      res,
      data,
      "Berhasil dimasukan ke dalam antrian proses"
    );
  } catch (error) {
    return errorResponse(res, error, "Gagal memasukan ke dalam antrian proses");
  }
};
