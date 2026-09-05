import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { like } from "../utils/dbHelpers.js";

const selectQuestionOptions = async (questions) => {
  if (!questions.length) return [];
  const ids = questions.map((q) => q.id);
  const placeholders = ids.map(() => "?").join(",");
  const [optionRows] = await pool.query(
    `SELECT id, question_id, title, score FROM options WHERE question_id IN (${placeholders}) ORDER BY id ASC`,
    ids,
  );
  const optionsByQuestion = {};
  for (const opt of optionRows) {
    if (!optionsByQuestion[opt.question_id]) optionsByQuestion[opt.question_id] = [];
    optionsByQuestion[opt.question_id].push({
      id: opt.id,
      question_id: opt.question_id,
      title: opt.title,
      score: opt.score,
    });
  }
  return questions.map((q) => ({
    id: q.id,
    quesioner_id: q.quesioner_id,
    title: q.title,
    type: q.type,
    is_required: q.is_required,
    options: optionsByQuestion[q.id] || [],
  }));
};

export const getQuesioners = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, description FROM quesioners",
    );
    return successResponse(res, rows, "Quesioner retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve quesioners");
  }
};

export const getQuestion = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;
  const searchLike = like(search);

  try {
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM questions WHERE title LIKE ?",
      [searchLike],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [rows] = await pool.query(
      "SELECT id, quesioner_id, title, type, is_required FROM questions WHERE title LIKE ? ORDER BY id ASC LIMIT ? OFFSET ?",
      [searchLike, limit, offset],
    );
    const questions = await selectQuestionOptions(rows);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, questions },
      "Question retrieved successfully",
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
  const searchLike = like(search);
  const quesionerId = parseInt(req.params.id);

  try {
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM questions WHERE quesioner_id = ? AND title LIKE ?",
      [quesionerId, searchLike],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [rows] = await pool.query(
      "SELECT id, quesioner_id, title, type, is_required FROM questions WHERE quesioner_id = ? AND title LIKE ? ORDER BY id ASC LIMIT ? OFFSET ?",
      [quesionerId, searchLike, limit, offset],
    );
    const questions = await selectQuestionOptions(rows);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, questions },
      `Question ${req.params.id} retrieved successfully`,
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve question");
  }
};

export const getAllQuestionByQuesionerId = async (req, res) => {
  try {
    const quesionerId = parseInt(req.params.id);
    const [rows] = await pool.query(
      "SELECT id, quesioner_id, title, type, is_required FROM questions WHERE quesioner_id = ? ORDER BY id ASC",
      [quesionerId],
    );
    const questions = await selectQuestionOptions(rows);
    return successResponse(
      res,
      questions,
      `Question ${req.params.id} retrieved successfully`,
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve question");
  }
};

export const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { title, type, options } = req.body;
  const questionId = parseInt(id);

  try {
    await pool.query(
      "UPDATE questions SET title = ?, type = ?, updated_at = NOW() WHERE id = ?",
      [title, type, questionId],
    );
    await pool.query(
      "DELETE FROM options WHERE question_id = ?",
      [questionId],
    );
    if (Array.isArray(options) && options.length) {
      for (const opt of options) {
        await pool.query(
          "INSERT INTO options (question_id, title, score, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
          [questionId, opt.title, opt.score],
        );
      }
    }

    const [rows] = await pool.query(
      "SELECT id, quesioner_id, title, type, is_required FROM questions WHERE id = ?",
      [questionId],
    );
    const [question] = await selectQuestionOptions(rows);
    return successResponse(res, question, "Question updated successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to update question");
  }
};
