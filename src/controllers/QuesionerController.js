import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getQuesioners = async (req, res) => {
  try {
    const response = await prisma.quesioner.findMany({
      select: {
        id: true,
        title: true,
        description: true,
      },
    });
    return successResponse(res, response, "Quesioner retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve quesioners");
  }
};

export const getQuestion = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.question.count({
      where: {
        title: {
          contains: search,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const questions = await prisma.question.findMany({
      where: {
        title: {
          contains: search,
        },
      },
      select: {
        id: true,
        quesioner_id: true,
        title: true,
        type: true,
        is_required: true,
        options: {
          select: {
            id: true,
            question_id: true,
            title: true,
            score: true,
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
      { totalRows, totalPage, page, limit, questions },
      "Question retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve question");
  }
};

export const getQuestionByQuesionerId = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.question.count({
      where: {
        quesioner_id: parseInt(req.params.id),
        title: {
          contains: search,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const questions = await prisma.question.findMany({
      where: {
        quesioner_id: parseInt(req.params.id),
        title: {
          contains: search,
        },
      },
      select: {
        id: true,
        quesioner_id: true,
        title: true,
        type: true,
        is_required: true,
        options: {
          select: {
            id: true,
            question_id: true,
            title: true,
            score: true,
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
      { totalRows, totalPage, page, limit, questions },
      `Question ${req.params.id} retrieved successfully`
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve question");
  }
};

export const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { title, type, options } = req.body;

  try {
    const question = await prisma.question.update({
      where: {
        id: parseInt(id),
      },
      data: {
        title,
        type,
        options: {
          deleteMany: {},
          createMany: {
            data: options,
          },
        },
      },
      select: {
        id: true,
        quesioner_id: true,
        title: true,
        type: true,
        is_required: true,
        options: {
          select: {
            id: true,
            question_id: true,
            title: true,
            score: true,
          },
        },
      },
    });

    return successResponse(res, question, "Question updated successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to update question");
  }
};
