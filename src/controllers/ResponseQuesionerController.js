import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getResponseQuesioner = async (req, res) => {
  try {
    const user = req.user;
    const id = Number(req.params.id);

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const family = await prisma.family.findFirst({
      where: {
        userId: user.id,
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

    const response = await prisma.response.findFirst({
      where: {
        familyMemberId: familyMember.id,
        quisionerId: id,
      },
      include: {
        answers: true,
      },
    });

    if (!response) {
      return res.json({
        totalRows: 0,
        totalPage: 0,
        page: 0,
        limit: 10,
        questions: [],
        answers: [],
      });
    }

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

export const createResponseQuesioner = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, 401, "Unauthorized");
    }

    const { id } = req.params;

    const answers = req.body.answers;
    if (!Array.isArray(answers)) {
      return errorResponse(res, 400, "Data must be an array in 'answers'");
    }

    const family = await prisma.family.findFirst({
      where: {
        userId: user.id,
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

    const responseRecord = await prisma.response.create({
      data: {
        quisionerId: Number(id),
        totalScore: 0,
        familyMemberId: familyMember.id,
        institutionId: null,
      },
    });

    const sanitizedData = answers.map((item) => ({
      questionId: Number(item.questionId),
      responseId: responseRecord.id,
      option_id: Number(item.option_id),
      score: Number(item.score),
      text_value: item.text_value ? String(item.text_value) : null,
      boolean_value: item.boolean_value ? Boolean(item.boolean_value) : null,
      scaleValue: item.scaleValue ? Number(item.scaleValue) : null,
    }));

    for (const item of sanitizedData) {
      if (
        typeof item.questionId !== "number" ||
        typeof item.responseId !== "string" ||
        typeof item.score !== "number"
      ) {
        return errorResponse(res, 400, "Invalid data format");
      }
      // Field optional: hanya validasi jika ada
      if (
        item.boolean_value !== undefined &&
        item.boolean_value !== null &&
        typeof item.boolean_value !== "boolean"
      ) {
        return errorResponse(res, 400, "Invalid boolean value format");
      }
      if (
        item.scaleValue !== undefined &&
        item.scaleValue !== null &&
        typeof item.scaleValue !== "number"
      ) {
        return errorResponse(res, 400, "Invalid scale value format");
      }
      if (
        item.text_value !== undefined &&
        item.text_value !== null &&
        typeof item.text_value !== "string"
      ) {
        return errorResponse(res, 400, "Invalid text value format");
      }
    }

    const response = await prisma.answer.createMany({
      data: sanitizedData,
    });

    const HitungScore = sanitizedData.reduce(
      (sum, item) => sum + (item.score || 0),
      0
    );

    await prisma.response.update({
      where: {
        id: responseRecord.id,
      },
      data: {
        totalScore: HitungScore,
      },
    });

    return successResponse(res, response, "Berhasil menjawab kuisioner");
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Gagal menjawab kuisioner, silahkan diulang"
    );
  }
};

export const checkAnsweredQuesioner = async (req, res) => {
  try {
    const user = req.user;
    const id = Number(req.params.id);

    const family = await prisma.family.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (!family) return errorResponse(res, 404, "Family not found");

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

    if (!familyMember)
      return errorResponse(res, 404, "Family member not found");

    const response = await prisma.response.findFirst({
      where: {
        familyMemberId: familyMember.id,
        quisionerId: id,
      },
      include: {
        answers: true,
      },
    });

    if (!response) {
      return res.json({
        answers: [],
        questions: [],
        page: 0,
        totalPage: 0,
        totalRows: 0,
      });
    }

    const totalQuestions = await prisma.question.count({
      where: { quesioner_id: id },
    });

    const totalAnswers = await prisma.answer.count({
      where: { responseId: response.id },
    });

    return res.json({ answered: totalAnswers === totalQuestions });
  } catch (error) {
    return errorResponse(res, error, "Failed to check answered status");
  }
};

export const updateResponseQuesioner = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { option_id, text_value, boolean_value, scaleValue, score } =
      req.body;

    const updateResponse = await prisma.answer.update({
      where: {
        id,
      },
      data: {
        option_id: Number(option_id),
        text_value,
        boolean_value:
          boolean_value === undefined || boolean_value === null
            ? null
            : Boolean(boolean_value),
        scaleValue: Number(scaleValue),
        score: Number(score),
      },
    });

    const answer = await prisma.answer.findFirst({
      where: { id },
    });

    const totalScore = await prisma.answer.aggregate({
      where: {
        responseId: answer.responseId,
      },
      _sum: { score: true },
    });

    await prisma.response.update({
      where: { id: answer.responseId },
      data: { totalScore: totalScore._sum.score || 0 },
    });

    return successResponse(res, updateResponse, "Berhasil mengupdate jawaban");
  } catch (error) {
    return errorResponse(res, error, "Failed to update response");
  }
};

export const getResponseQuesionerInstitution = async (req, res) => {
  try {
    const user = req.user;
    const quesionerId = Number(req.params.id);

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const institution = await prisma.institution.findFirst({
      where: {
        user_id: user.id,
      },
    });

    if (!institution) {
      return errorResponse(res, 404, "Institution not found");
    }

    const response = await prisma.response.findFirst({
      where: {
        institutionId: institution.id,
        quisionerId: quesionerId,
      },
    });

    if (!response) {
      return res.json({
        totalRows: 0,
        totalPage: 0,
        page: 0,
        limit: 10,
        questions: [],
        answers: [],
      });
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

export const createResponseQuesionerInstitution = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return errorResponse(res, 401, "Unauthorized");
    }

    const { id } = req.params;
    const answers = req.body.answers;
    if (!Array.isArray(answers)) {
      return errorResponse(res, 400, "Data must be an array in 'answers'");
    }

    // Cari institution milik user
    const institution = await prisma.institution.findFirst({
      where: { user_id: user.id },
    });

    if (!institution) {
      return errorResponse(res, 404, "Institution not found");
    }

    // Buat response baru untuk institution
    const responseRecord = await prisma.response.create({
      data: {
        quisionerId: Number(id),
        totalScore: 0,
        familyMemberId: null,
        institutionId: institution.id,
      },
    });

    const sanitizedData = answers.map((item) => ({
      questionId: Number(item.questionId),
      responseId: responseRecord.id,
      option_id: item.option_id !== undefined ? Number(item.option_id) : null,
      score: Number(item.score),
      text_value: item.text_value ? String(item.text_value) : null,
      boolean_value:
        item.boolean_value !== undefined ? Boolean(item.boolean_value) : null,
      scaleValue:
        item.scaleValue !== undefined ? Number(item.scaleValue) : null,
    }));

    for (const item of sanitizedData) {
      if (
        typeof item.questionId !== "number" ||
        typeof item.responseId !== "string" ||
        typeof item.score !== "number"
      ) {
        return errorResponse(res, 400, "Invalid data format");
      }
      if (
        item.boolean_value !== undefined &&
        item.boolean_value !== null &&
        typeof item.boolean_value !== "boolean"
      ) {
        return errorResponse(res, 400, "Invalid boolean value format");
      }
      if (
        item.scaleValue !== undefined &&
        item.scaleValue !== null &&
        typeof item.scaleValue !== "number"
      ) {
        return errorResponse(res, 400, "Invalid scale value format");
      }
      if (
        item.text_value !== undefined &&
        item.text_value !== null &&
        typeof item.text_value !== "string"
      ) {
        return errorResponse(res, 400, "Invalid text value format");
      }
    }

    const response = await prisma.answer.createMany({
      data: sanitizedData,
    });

    const HitungScore = sanitizedData.reduce(
      (sum, item) => sum + (item.score || 0),
      0
    );

    await prisma.response.update({
      where: {
        id: responseRecord.id,
      },
      data: {
        totalScore: HitungScore,
      },
    });

    return successResponse(res, response, "Berhasil menjawab kuisioner");
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Gagal menjawab kuisioner, silahkan diulang"
    );
  }
};

export const checkAnsweredQuesionerInstitution = async (req, res) => {
  try {
    const user = req.user;
    const quesionerId = Number(req.params.id);

    // Cari institution milik user
    const institution = await prisma.institution.findFirst({
      where: { user_id: user.id },
    });

    if (!institution) return errorResponse(res, 404, "Institution not found");

    // Cari response untuk institution & quesioner
    const response = await prisma.response.findFirst({
      where: {
        institutionId: institution.id,
        quisionerId: quesionerId,
      },
    });

    // Jika belum pernah menjawab, return answered: false
    if (!response) return res.json({ answered: false });

    // Hitung total pertanyaan pada quesioner
    const totalQuestions = await prisma.question.count({
      where: { quesioner_id: quesionerId },
    });

    // Hitung total jawaban pada response
    const totalAnswers = await prisma.answer.count({
      where: { responseId: response.id },
    });

    return res.json({ answered: totalAnswers === totalQuestions });
  } catch (error) {
    return errorResponse(res, error, "Failed to check answered status");
  }
};
