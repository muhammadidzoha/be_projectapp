import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { like } from "../utils/dbHelpers.js";

export const getCategory = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM categories WHERE name LIKE ?",
      [like(search)],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [categories] = await pool.query(
      "SELECT id, name, path FROM categories WHERE name LIKE ? ORDER BY id ASC LIMIT ? OFFSET ?",
      [like(search), limit, offset],
    );

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, categories },
      "Categories retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};
