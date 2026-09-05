import pool from "../config/db.js";
import { randomUUID } from "node:crypto";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { getInstitutionByUser } from "../helpers/InstitutionHelper.js";
import {
  getOrCreateCurrentPeriod,
  getPeriodLabelShort,
} from "../helpers/MonitoringHelper.js";
import { like } from "../utils/dbHelpers.js";

const selectQuestions = async (quesionerId, search = "") => {
  const searchLike = like(search);
  const [rows] = await pool.query(
    `SELECT id, quesioner_id, title, type FROM questions WHERE quesioner_id = ? AND title LIKE ? ORDER BY id ASC`,
    [quesionerId, searchLike],
  );
  if (!rows.length) return [];
  const ids = rows.map((q) => q.id);
  const placeholders = ids.map(() => "?").join(",");
  const [optRows] = await pool.query(
    `SELECT id, question_id, title, score FROM options WHERE question_id IN (${placeholders}) ORDER BY id ASC`,
    ids,
  );
  const byQ = {};
  for (const o of optRows) {
    if (!byQ[o.question_id]) byQ[o.question_id] = [];
    byQ[o.question_id].push({ id: o.id, title: o.title, score: o.score });
  }
  return rows.map((q) => ({
    id: q.id,
    quesioner_id: q.quesioner_id,
    title: q.title,
    type: q.type,
    options: byQ[q.id] || [],
  }));
};

export const getResponseQuesioner = async (req, res) => {
  try {
    const user = req.user;
    const id = Number(req.params.id);

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const [familyRows] = await pool.query(
      "SELECT * FROM families WHERE userId = ? LIMIT 1",
      [user.id],
    );
    const family = familyRows[0];
    if (!family) {
      return errorResponse(res, 404, "Family not found");
    }

    const [fmRows] = await pool.query(
      `SELECT * FROM family_members WHERE familyId = ? AND (relation = 'IBU' OR relation = 'AYAH') LIMIT 1`,
      [family.id],
    );
    const familyMember = fmRows[0];
    if (!familyMember) {
      return errorResponse(res, 404, "Family member not found");
    }

    const [respRows] = await pool.query(
      `SELECT * FROM responses WHERE familyMemberId = ? AND quisionerId = ? ORDER BY id DESC LIMIT 1`,
      [familyMember.id, id],
    );
    const response = respRows[0];
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

    const searchLike = like(search);
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM questions WHERE quesioner_id = ? AND title LIKE ?",
      [id, searchLike],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [qRows] = await pool.query(
      "SELECT id, quesioner_id, title, type FROM questions WHERE quesioner_id = ? AND title LIKE ? LIMIT ? OFFSET ?",
      [id, searchLike, limit, offset],
    );
    const questions = await selectQuestions(id, search).then((all) =>
      qRows.map((q) => all.find((x) => x.id === q.id)),
    );

    const questionIds = qRows.map((q) => q.id);
    let answers = [];
    if (questionIds.length) {
      const qph = questionIds.map(() => "?").join(",");
      const [aRows] = await pool.query(
        `SELECT * FROM answers WHERE responseId = ? AND questionId IN (${qph}) ORDER BY id ASC`,
        [response.id, ...questionIds],
      );
      answers = aRows;
    }

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, questions, answers },
      "Berhasil mendapatkan data",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response");
  }
};

const getFamilyMemberForParent = async (userId) => {
  const [familyRows] = await pool.query(
    "SELECT * FROM families WHERE userId = ? LIMIT 1",
    [userId],
  );
  const family = familyRows[0];
  if (!family) return { family: null, familyMember: null };
  const [fmRows] = await pool.query(
    `SELECT * FROM family_members WHERE familyId = ? AND (relation = 'IBU' OR relation = 'AYAH') LIMIT 1`,
    [family.id],
  );
  return { family, familyMember: fmRows[0] || null };
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

    const { family, familyMember } = await getFamilyMemberForParent(user.id);
    if (!family) {
      return errorResponse(res, 404, "Family not found");
    }
    if (!familyMember) {
      return errorResponse(res, 404, "Family member not found");
    }

    let periodLabel = null;
    if (user.role === "school") {
      periodLabel = getPeriodLabelShort(new Date());
    } else {
      if (family) {
        const period = await getOrCreateCurrentPeriod(family.id);
        periodLabel = period.label;
      }
    }

    const responseRecordId = randomUUID();
    await pool.query(
      "INSERT INTO responses (id, quisionerId, totalScore, familyMemberId, institutionId, periodLabel, created_at) VALUES (?, ?, 0, ?, ?, ?, NOW())",
      [responseRecordId, Number(id), familyMember.id, null, periodLabel],
    );

    const sanitizedData = answers.map((item) => ({
      questionId: Number(item.questionId),
      responseId: responseRecordId,
      option_id: Number(item.option_id),
      score: Number(item.score),
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
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const item of sanitizedData) {
        await conn.query(
          "INSERT INTO answers (questionId, responseId, option_id, score, boolean_value, scaleValue) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score), option_id = VALUES(option_id), boolean_value = VALUES(boolean_value), scaleValue = VALUES(scaleValue)",
          [
            item.questionId,
            item.responseId,
            item.option_id,
            item.score,
            item.boolean_value,
            item.scaleValue,
          ],
        );
      }
      const totalScore = sanitizedData.reduce(
        (sum, item) => sum + (item.score || 0),
        0,
      );
      await conn.query(
        "UPDATE responses SET totalScore = ? WHERE id = ?",
        [totalScore, responseRecordId],
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [countRows] = await pool.query(
      "SELECT COUNT(*) AS total FROM answers WHERE responseId = ?",
      [responseRecordId],
    );

    return successResponse(
      res,
      { count: countRows[0].total },
      "Berhasil menjawab kuesioner",
    );
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Gagal menjawab kuesioner, silahkan diulang",
    );
  }
};

export const checkAnsweredQuesioner = async (req, res) => {
  try {
    const user = req.user;
    const id = Number(req.params.id);

    const { family, familyMember } = await getFamilyMemberForParent(user.id);
    if (!family) return errorResponse(res, 404, "Family not found");
    if (!familyMember) return errorResponse(res, 404, "Family member not found");

    const [respRows] = await pool.query(
      "SELECT * FROM responses WHERE familyMemberId = ? AND quisionerId = ? ORDER BY id DESC LIMIT 1",
      [familyMember.id, id],
    );
    const response = respRows[0];
    if (!response) {
      return res.json({
        answers: [],
        questions: [],
        page: 0,
        totalPage: 0,
        totalRows: 0,
      });
    }

    const [[qCountRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM questions WHERE quesioner_id = ?",
      [id],
    );
    const totalQuestions = qCountRow.total;

    const [[aCountRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM answers WHERE responseId = ?",
      [response.id],
    );
    const totalAnswers = aCountRow.total;

    const hasExisting = totalAnswers > 0;
    return res.json({
      answered: hasExisting && totalAnswers === totalQuestions,
      canRefill: true,
      lastResponse: hasExisting
        ? {
            id: response.id,
            date: response.created_at,
            totalScore: response.totalScore,
          }
        : null,
      periodLabel: response?.periodLabel ?? null,
    });
  } catch (error) {
    return errorResponse(res, error, "Failed to check answered status");
  }
};

export const updateResponseQuesioner = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { option_id, boolean_value, scaleValue, score } = req.body;

    await pool.query(
      "UPDATE answers SET option_id = ?, boolean_value = ?, scaleValue = ?, score = ? WHERE id = ?",
      [
        Number(option_id),
        boolean_value === undefined || boolean_value === null
          ? null
          : Boolean(boolean_value),
        Number(scaleValue),
        Number(score),
        id,
      ],
    );

    const [aRows] = await pool.query("SELECT * FROM answers WHERE id = ?", [id]);
    const answer = aRows[0];

    const [[sumRow]] = await pool.query(
      "SELECT COALESCE(SUM(score),0) AS total FROM answers WHERE responseId = ?",
      [answer.responseId],
    );
    await pool.query("UPDATE responses SET totalScore = ? WHERE id = ?", [
      sumRow.total,
      answer.responseId,
    ]);

    return successResponse(res, answer, "Berhasil mengupdate jawaban");
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

    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) {
      return errorResponse(res, 404, "Institution not found");
    }

    const [respRows] = await pool.query(
      "SELECT * FROM responses WHERE institutionId = ? AND quisionerId = ? ORDER BY id DESC LIMIT 1",
      [institution.id, quesionerId],
    );
    const response = respRows[0];
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

    const searchLike = like(search);
    const [qRows] = await pool.query(
      "SELECT id, quesioner_id, title, type FROM questions WHERE quesioner_id = ? AND title LIKE ? ORDER BY id ASC",
      [quesionerId, searchLike],
    );
    const questions = await selectQuestions(quesionerId, search);
    const questionIds = qRows.map((q) => q.id);

    let totalRows = 0;
    let answers = [];
    if (questionIds.length) {
      const qph = questionIds.map(() => "?").join(",");
      const [[cRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM answers WHERE responseId = ? AND questionId IN (${qph})`,
        [response.id, ...questionIds],
      );
      totalRows = cRow.total;
      const [aRows] = await pool.query(
        `SELECT * FROM answers WHERE responseId = ? AND questionId IN (${qph}) ORDER BY id ASC LIMIT ? OFFSET ?`,
        [response.id, ...questionIds, limit, offset],
      );
      answers = aRows;
    }
    const totalPage = Math.ceil(totalRows / limit);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, questions, answers },
      "Berhasil mendapatkan data",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response");
  }
};

const createResponseInstitution = async (req, res, institution, id, answers) => {
  const periodLabel = getPeriodLabelShort(new Date());

  const responseRecordId = randomUUID();
  await pool.query(
    "INSERT INTO responses (id, quisionerId, totalScore, familyMemberId, institutionId, periodLabel, created_at) VALUES (?, ?, 0, NULL, ?, ?, NOW())",
    [responseRecordId, Number(id), institution.id, periodLabel],
  );

  const sanitizedData = answers.map((item) => ({
    questionId: Number(item.questionId),
    responseId: responseRecordId,
    option_id: item.option_id !== undefined ? Number(item.option_id) : null,
    score: Number(item.score),
    boolean_value:
      item.boolean_value !== undefined ? Boolean(item.boolean_value) : null,
    scaleValue: item.scaleValue !== undefined ? Number(item.scaleValue) : null,
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
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const item of sanitizedData) {
      await conn.query(
        "INSERT INTO answers (questionId, responseId, option_id, score, boolean_value, scaleValue) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score), option_id = VALUES(option_id), boolean_value = VALUES(boolean_value), scaleValue = VALUES(scaleValue)",
        [
          item.questionId,
          item.responseId,
          item.option_id,
          item.score,
          item.boolean_value,
          item.scaleValue,
        ],
      );
    }
    const totalScore = sanitizedData.reduce(
      (sum, item) => sum + (item.score || 0),
      0,
    );
    await conn.query("UPDATE responses SET totalScore = ? WHERE id = ?", [
      totalScore,
      responseRecordId,
    ]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return { responseRecordId };
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

    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) {
      return errorResponse(res, 404, "Institution not found");
    }

    const { responseRecordId } = await createResponseInstitution(
      req,
      res,
      institution,
      id,
      answers,
    );

    return successResponse(res, { id: responseRecordId }, "Berhasil menjawab kuesioner");
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Gagal menjawab kuesioner, silahkan diulang",
    );
  }
};

export const checkAnsweredQuesionerInstitution = async (req, res) => {
  try {
    const user = req.user;
    const quesionerId = Number(req.params.id);

    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) return errorResponse(res, 404, "Institution not found");

    const [respRows] = await pool.query(
      "SELECT * FROM responses WHERE institutionId = ? AND quisionerId = ? ORDER BY id DESC LIMIT 1",
      [institution.id, quesionerId],
    );
    const response = respRows[0];
    if (!response) return res.json({ answered: false });

    const [[qCountRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM questions WHERE quesioner_id = ?",
      [quesionerId],
    );
    const totalQuestions = qCountRow.total;

    const [[aCountRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM answers WHERE responseId = ?",
      [response.id],
    );
    const totalAnswers = aCountRow.total;

    const hasExisting = totalAnswers > 0;
    return res.json({
      answered: hasExisting && totalAnswers === totalQuestions,
      canRefill: true,
      lastResponse: hasExisting
        ? {
            id: response.id,
            date: response.created_at,
            totalScore: response.totalScore,
          }
        : null,
      periodLabel: response?.periodLabel ?? null,
    });
  } catch (error) {
    return errorResponse(res, error, "Failed to check answered status");
  }
};

export const getResponseHistory = async (req, res) => {
  try {
    const user = req.user;
    const id = Number(req.params.id);

    const { family, familyMember } = await getFamilyMemberForParent(user.id);
    if (!family) return errorResponse(res, 404, "Family not found");
    if (!familyMember) return errorResponse(res, 404, "Family member not found");

    const [responses] = await pool.query(
      `SELECT r.* FROM responses r
       WHERE r.familyMemberId = ? AND r.quisionerId = ?
       ORDER BY r.id DESC`,
      [familyMember.id, id],
    );
    for (const r of responses) {
      const [answers] = await pool.query(
        "SELECT * FROM answers WHERE responseId = ? ORDER BY id ASC",
        [r.id],
      );
      r.answers = answers;
    }

    const questions = await selectQuestions(id);

    return successResponse(
      res,
      { responses, questions },
      "Berhasil mendapatkan riwayat",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response history");
  }
};

export const showResponseForParent = async (req, res) => {
  try {
    const userId = req.params.userId;
    const id = Number(req.params.id);

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const [fmRows] = await pool.query(
      `SELECT * FROM family_members WHERE familyId = ? AND (relation = 'IBU' OR relation = 'AYAH') LIMIT 1`,
      [userId],
    );
    const familyMember = fmRows[0];
    if (!familyMember) {
      return errorResponse(res, 404, "Family member not found");
    }

    const [respRows] = await pool.query(
      "SELECT * FROM responses WHERE familyMemberId = ? AND quisionerId = ? ORDER BY id DESC LIMIT 1",
      [familyMember.id, id],
    );
    const response = respRows[0];
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

    const searchLike = like(search);
    const [qRows] = await pool.query(
      "SELECT id, quesioner_id, title, type FROM questions WHERE quesioner_id = ? AND title LIKE ? ORDER BY id ASC",
      [id, searchLike],
    );
    const questionIds = qRows.map((q) => q.id);
    const questions = await selectQuestions(id, search);

    let totalRows = 0;
    let answers = [];
    if (questionIds.length) {
      const qph = questionIds.map(() => "?").join(",");
      const [[cRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM answers WHERE responseId = ? AND questionId IN (${qph})`,
        [response.id, ...questionIds],
      );
      totalRows = cRow.total;
      const [aRows] = await pool.query(
        `SELECT * FROM answers WHERE responseId = ? AND questionId IN (${qph}) ORDER BY id ASC LIMIT ? OFFSET ?`,
        [response.id, ...questionIds, limit, offset],
      );
      answers = aRows;
    }
    const totalPage = Math.ceil(totalRows / limit);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, questions, answers },
      "Berhasil mendapatkan data",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response");
  }
};

export const getResponseHistoryInstitution = async (req, res) => {
  try {
    const user = req.user;
    const quesionerId = Number(req.params.id);

    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) return errorResponse(res, 404, "Institution not found");

    const [responses] = await pool.query(
      `SELECT r.* FROM responses r
       WHERE r.institutionId = ? AND r.quisionerId = ?
       ORDER BY r.id DESC`,
      [institution.id, quesionerId],
    );
    for (const r of responses) {
      const [answers] = await pool.query(
        "SELECT * FROM answers WHERE responseId = ? ORDER BY id ASC",
        [r.id],
      );
      r.answers = answers;
    }

    const questions = await selectQuestions(quesionerId);

    return successResponse(
      res,
      { responses, questions },
      "Berhasil mendapatkan riwayat",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response history");
  }
};

export const showResponseForInstitution = async (req, res) => {
  try {
    const user_id = Number(req.params.user_id);
    const quesionerId = Number(req.params.id);

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const [instRows] = await pool.query(
      "SELECT * FROM institutions WHERE id = ? LIMIT 1",
      [user_id],
    );
    const institution = instRows[0];
    if (!institution) {
      return errorResponse(res, 404, "Institution not found");
    }

    const [respRows] = await pool.query(
      "SELECT * FROM responses WHERE institutionId = ? AND quisionerId = ? ORDER BY id DESC LIMIT 1",
      [institution.id, quesionerId],
    );
    const response = respRows[0];
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

    const searchLike = like(search);
    const [qRows] = await pool.query(
      "SELECT id, quesioner_id, title, type FROM questions WHERE quesioner_id = ? AND title LIKE ? ORDER BY id ASC",
      [quesionerId, searchLike],
    );
    const questionIds = qRows.map((q) => q.id);
    const questions = await selectQuestions(quesionerId, search);

    let totalRows = 0;
    let answers = [];
    if (questionIds.length) {
      const qph = questionIds.map(() => "?").join(",");
      const [[cRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM answers WHERE responseId = ? AND questionId IN (${qph})`,
        [response.id, ...questionIds],
      );
      totalRows = cRow.total;
      const [aRows] = await pool.query(
        `SELECT * FROM answers WHERE responseId = ? AND questionId IN (${qph}) ORDER BY id ASC LIMIT ? OFFSET ?`,
        [response.id, ...questionIds, limit, offset],
      );
      answers = aRows;
    }
    const totalPage = Math.ceil(totalRows / limit);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, questions, answers },
      "Berhasil mendapatkan data",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response");
  }
};
