import { randomUUID } from "node:crypto";
import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { getInstitutionByUser } from "../helpers/InstitutionHelper.js";
import { like } from "../utils/dbHelpers.js";

export const getPartners = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const user = req.user;
    const institution = await getInstitutionByUser(user.id, user.role);

    if (!institution) return errorResponse(res, null, "Institution not found");

    const searchLike = like(search);
    const searchCondition = search
      ? " AND (i.name LIKE ? OR i.address LIKE ? OR i.phone LIKE ?)"
      : "";

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM partnerships p
       JOIN institutions i ON i.id = p.healthcareId
       WHERE p.schoolId = ?${searchCondition}`,
      search ? [institution.id, searchLike, searchLike, searchLike] : [institution.id],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [partnerships] = await pool.query(
      `SELECT p.id, p.schoolId, p.healthcareId, p.createdAt,
              i.id AS healthcare_id, i.name AS healthcare_name,
              i.address AS healthcare_address, i.phone AS healthcare_phone,
              i.email AS healthcare_email
       FROM partnerships p
       JOIN institutions i ON i.id = p.healthcareId
       WHERE p.schoolId = ?${searchCondition}
       ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`,
      search
        ? [institution.id, searchLike, searchLike, searchLike, limit, offset]
        : [institution.id, limit, offset],
    );

    const mapped = partnerships.map((p) => ({
      id: p.id,
      schoolId: p.schoolId,
      healthcareId: p.healthcareId,
      createdAt: p.createdAt,
      healthcare: {
        id: p.healthcare_id,
        name: p.healthcare_name,
        address: p.healthcare_address,
        phone: p.healthcare_phone,
        email: p.healthcare_email,
      },
    }));

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, partnerships: mapped },
      "Partners retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get partners");
  }
};

export const addPartners = async (req, res) => {
  try {
    const user = req.user;
    const { healthcareIds } = req.body;

    if (!Array.isArray(healthcareIds) || healthcareIds.length === 0) {
      return errorResponse(
        res,
        null,
        "healthcareIds must be a non-empty array",
      );
    }

    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) return errorResponse(res, null, "Institution not found");

    for (const healthcareId of healthcareIds) {
      const [existing] = await pool.query(
        "SELECT id FROM partnerships WHERE schoolId = ? AND healthcareId = ? LIMIT 1",
        [institution.id, healthcareId],
      );
      if (existing[0]) continue;
      await pool.query(
        "INSERT INTO partnerships (id, schoolId, healthcareId, createdAt) VALUES (?, ?, ?, NOW())",
        [randomUUID(), institution.id, healthcareId],
      );
    }

    return successResponse(res, null, "Partners added successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to add partners");
  }
};

export const deletePartner = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM partnerships WHERE id = ?", [id]);
    return successResponse(res, null, "Partner removed successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to remove partner");
  }
};
