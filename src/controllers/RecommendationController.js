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
                familyId: true,
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

export const getResponseParent = async (req, res) => {
  try {
    const { userId } = req.body;

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const family = await prisma.family.findFirst({
      where: {
        userId,
      },
    });

    if (!family) {
      return errorResponse(res, 404, "Family not found");
    }

    const familyMember = await prisma.familyMember.findFirst({
      where: {
        familyId: family.id,
        OR: [
          {
            relation: "IBU",
          },
          {
            relation: "AYAH",
          },
        ],
      },
    });

    if (!familyMember) {
      return errorResponse(res, 404, "Family member not found");
    }

    const response = await prisma.response.findMany({
      where: {
        familyMemberId: familyMember.id,
      },
      include: {
        answers: true,
      },
    });

    const questions = await prisma.question.findMany({
      where: {
        quesioner_id: id,
        title: {
          contains: search,
        },
      },
      select: {
        id: true,
        quesioner_id: true,
        title: true,
        type: true,
        options: {
          select: {
            id: true,
            title: true,
            score: true,
          },
        },
      },
    });

    const questionIds = questions.map((q) => q.id);

    const totalRows = await prisma.answer.count({
      where: {
        responseId: response.id,
        questionId: {
          in: questionIds,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const answers = await prisma.answer.findMany({
      where: {
        responseId: response.id,
        questionId: {
          in: questionIds,
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
      {
        totalRows,
        totalPage,
        page,
        limit,
        questions,
        answers,
      },
      "Berhasil mendapatkan data"
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response");
  }
};

export const getResponseInstitution = async (req, res) => {
  try {
    const { userId } = req.body;
    const quesionerId = Number(req.params.id);

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const institution = await prisma.institution.findFirst({
      where: {
        user_id: userId,
      },
    });

    if (!institution) {
      return errorResponse(res, 404, "Institution not found");
    }

    const response = await prisma.response.findFirst({
      where: {
        institutionId: institution.id,
      },
    });

    if (!response) {
      return errorResponse(res, 404, "Response not found");
    }

    const questions = await prisma.question.findMany({
      where: {
        quesioner_id: quesionerId,
        title: {
          contains: search,
        },
      },
      select: {
        id: true,
        quesioner_id: true,
        title: true,
        type: true,
        options: {
          select: {
            id: true,
            title: true,
            score: true,
          },
        },
      },
    });

    const questionIds = questions.map((q) => q.id);

    const totalRows = await prisma.answer.count({
      where: {
        responseId: response.id,
        questionId: {
          in: questionIds,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);

    const answers = await prisma.answer.findMany({
      where: {
        responseId: response.id,
        questionId: {
          in: questionIds,
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
      {
        totalRows,
        totalPage,
        page,
        limit,
        questions,
        answers,
      },
      "Berhasil mendapatkan data"
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response");
  }
};

export const createIntervention = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "healthcare") {
      throw new Error("User not have access to this resource");
    }
    const { id } = req.params;
    if (!id) {
      throw new Error("RecommendationId is required in params");
    }
    const { content, forType, notes } = req.body;
    const intervention = await prisma.$transaction(async (trx) => {
      const intervention = await trx.intervention.createMany({
        data: [
          {
            forType,
            notes,
            options: content,
            recommendationId: id,
            user_id: user.id,
          },
          {
            forType: forType === "PARENT" ? "SCHOOL" : "PARENT",
            notes,
            options: content,
            recommendationId: id,
            user_id: user.id,
          },
        ],
      });
      await trx.recommendation.update({
        where: {
          id,
        },
        data: {
          status: "COMPLETED",
        },
      });

      return intervention;
    });

    res.status(201).json({
      status: "Success",
      message: "Intervention created",
      data: intervention,
    });
  } catch (err) {
    console.log(err.message);
    return errorResponse(res, err, "Failed to get response");
  }
};

export const getSingleRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const recommendation = await prisma.recommendation.findUnique({
      where: {
        id,
      },
      include: {
        submittedBy: {
          select: {
            institution: {
              select: {
                name: true,
              },
            },
          },
        },
        Intervention: true,
        student: {
          include: {
            class: true,
            familyMember: {
              include: {
                family: {
                  include: {
                    user: {
                      include: { family: { include: { familyMember: true } } },
                    },
                  },
                },
                residence: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: "Success",
      message: "Recommendation fetched",
      data: recommendation,
    });
  } catch (err) {
    console.log({ err });
    return errorResponse(res, err, "Failed to get response");
  }
};

export const getInterventionsBelongToInstitution = async (req, res) => {
  try {
    const user = req.user;
    const userInstitution = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        institution: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!userInstitution) {
      throw new Error("user not found");
    }
    console.log({ userInstitution });
    const interventions = await prisma.intervention.findMany({
      where: {
        user: {
          institution: {
            id: userInstitution.institution.id,
          },
        },
      },
      distinct: ["recommendationId"],
      select: {
        recommendation: {
          select: {
            student: {
              select: {
                nis: true,
                class: {
                  select: {
                    name: true,
                  },
                },
                familyMember: {
                  select: {
                    fullName: true,
                    birthDate: true,
                    gender: true,
                    residence: {
                      select: {
                        address: true,
                      },
                    },
                    family: {
                      select: {
                        user: {
                          select: {
                            family: {
                              select: {
                                familyMember: {
                                  select: {
                                    fullName: true,
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            id: true,
            status: true,
            createdAt: true,
            submittedBy: {
              select: {
                institution: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        id: true,
        forType: true,
        notes: true,
        options: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      status: "Success",
      message: "Interventions Belongs to Institution fetched",
      data: interventions.map((val) => ({
        ...val,
        options: JSON.parse(val.options),
      })),
    });
  } catch (err) {
    console.log({ err });
    return errorResponse(res, err, "Failed to get response");
  }
};

export const getInterventionsBelongToFamily = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new Error("user not found");
    }
    const interventions = await prisma.intervention.findMany({
      where: {
        recommendation: {
          student: {
            familyMember: {
              family: {
                userId: user.id,
              },
            },
          },
        },
        forType: "PARENT",
      },
    });

    res.status(200).json({
      status: "Success",
      message: "Intervention belongs to family fetched",
      data: interventions.map((val) => ({
        ...val,
        options: JSON.parse(val.options),
      })),
    });
  } catch (err) {
    console.log({ err });
    return errorResponse(res, err, "Failed to get response");
  }
};

export const getInterventionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id is required");
    }
    const intervention = await prisma.intervention.findUnique({
      where: {
        id,
      },
    });
    if (!intervention) {
      throw new Error(`Intervention with id ${id} is not found`);
    }
    res.status(200).json({
      status: "Success",
      message: "Intervention retrieved",
      data: {
        ...intervention,
        options: JSON.parse(intervention.options),
      },
    });
  } catch (err) {
    return errorResponse(res, err, "Failed to get response");
  }
};

export const deleteIntervention = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id is required");
    }
    const intervention = await prisma.intervention.findUnique({
      where: {
        id,
      },
    });
    if (!intervention) {
      throw new Error(`Intervention with id ${id} is not found`);
    }
    await prisma.intervention.delete({
      where: {
        id,
      },
    });
    res.status(200).json({
      status: "Success",
      message: "Intervention deleted",
      data: intervention,
    });
  } catch (err) {
    return errorResponse(res, err, "Failed to get response");
  }
};
