import argon2 from "argon2";
import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const HASH_OPTIONS = { parallelism: 1, memoryCost: 65536, timeCost: 3 };

export const getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;
  const searchLike = `%${search}%`;

  const [[countRow]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE username LIKE ? OR email LIKE ?",
    [searchLike, searchLike],
  );
  const totalRows = countRow.total;
  const totalPage = Math.ceil(totalRows / limit);

  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.email,
            r.name AS role_name,
            i.id AS institution_id, i.name AS institution_name, i.phone AS institution_phone,
            ti.id AS teacher_institution_id, ti.name AS teacher_institution_name, ti.phone AS teacher_institution_phone
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN institutions i ON i.user_id = u.id
     LEFT JOIN teachers t ON t.user_id = u.id
     LEFT JOIN institutions ti ON ti.id = t.school_id
     WHERE u.username LIKE ? OR u.email LIKE ?
     ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    [searchLike, searchLike, limit, offset],
  );

  const users = rows.map((row) => {
    const base = {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role_name ? { name: row.role_name } : null,
    };
    if (row.institution_id) {
      base.institution = {
        id: row.institution_id,
        name: row.institution_name,
        phone: row.institution_phone,
      };
    }
    if (row.teacher_institution_id) {
      base.teacher = {
        institution: {
          id: row.teacher_institution_id,
          name: row.teacher_institution_name,
          phone: row.teacher_institution_phone,
        },
      };
    }
    return base;
  });

  return successResponse(
    res,
    { totalRows, totalPage, page, limit, users },
    "Users retrieved successfully",
  );
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email,
              r.name AS role_name,
              i.name AS institution_name, i.address AS institution_address,
              i.email AS institution_email, i.phone AS institution_phone,
              c.name AS city_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN institutions i ON i.user_id = u.id
       LEFT JOIN cities c ON c.id = i.city_id
       WHERE u.id = ?
       LIMIT 1`,
      [id],
    );
    const user = rows[0];
    if (!user) {
      return errorResponse(res, null, "User Not Found");
    }
    const result = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: { name: user.role_name },
      ...(user.institution_name
        ? {
            institution: {
              name: user.institution_name,
              address: user.institution_address,
              email: user.institution_email,
              phone: user.institution_phone,
              city: user.city_name ? { name: user.city_name } : null,
            },
          }
        : {}),
    };
    return successResponse(
      res,
      result,
      `User with ID: ${id} retrieved successfully`,
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, error, "Error retrieving user");
  }
};

export const updateUser = async (req, res) => {};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      id,
    ]);
    const user = users[0];

    if (!user) {
      return errorResponse(res, null, "User Not Found");
    }

    if (user.role_id === 1) {
      return errorResponse(res, null, "Cannot delete admin user");
    } else {
      await pool.query("DELETE FROM users WHERE id = ?", [id]);
    }
    return successResponse(res, 200, "Berhasil menghapus user");
  } catch (error) {
    return errorResponse(res, error, "Gagal menghapus user");
  }
};
