import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { like } from "../utils/dbHelpers.js";

const getUserInstitution = async (userId) => {
  const [rows] = await pool.query(
    "SELECT i.id FROM users u JOIN institutions i ON i.user_id = u.id WHERE u.id = ? LIMIT 1",
    [userId],
  );
  if (!rows[0])
    throw new Error("User tidak terdaftar di institusi manapun");
  return rows[0].id;
};

export const getClasses = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const school_id = await getUserInstitution(req.user.id);
    const searchLike = like(search);

    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM classes WHERE name LIKE ? AND school_id = ?",
      [searchLike, school_id],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [rows] = await pool.query(
      `SELECT cl.id, cl.name, cl.school_id,
              t.id AS teacher_id, t.fullName AS teacher_fullName
       FROM classes cl
       LEFT JOIN teachers t ON t.id = cl.teacher_id
       WHERE cl.name LIKE ? AND cl.school_id = ?
       ORDER BY cl.id ASC LIMIT ? OFFSET ?`,
      [searchLike, school_id, limit, offset],
    );

    const classes = rows.map((row) => ({
      id: row.id,
      name: row.name,
      school_id: row.school_id,
      teacher: row.teacher_id
        ? { id: row.teacher_id, fullName: row.teacher_fullName }
        : null,
    }));

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, classes },
      "Classes retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve classes");
  }
};

export const createClasses = async (req, res) => {
  const { classes } = req.body;

  try {
    const school_id = await getUserInstitution(req.user.id);

    if (Array.isArray(classes)) {
      const createdClasses = [];
      for (const cls of classes) {
        const [existing] = await pool.query(
          "SELECT id FROM classes WHERE name = ? AND school_id = ? LIMIT 1",
          [cls.name, school_id],
        );
        if (!existing[0]) {
          const [result] = await pool.query(
            "INSERT INTO classes (name, school_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
            [cls.name, school_id],
          );
          createdClasses.push({
            id: result.insertId,
            name: cls.name,
            school_id,
          });
        }
      }
      return successResponse(res, createdClasses, "Berhasil membuat kelas");
    } else {
      const [existing] = await pool.query(
        "SELECT id FROM classes WHERE name = ? AND school_id = ? LIMIT 1",
        [classes.name, school_id],
      );
      if (existing[0]) {
        return errorResponse(
          res,
          "Kelas sudah tersedia",
          "Tidak dapat membuat kelas yang sudah ada",
        );
      }
      const [result] = await pool.query(
        "INSERT INTO classes (name, school_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
        [classes.name, school_id],
      );
      const newClass = { id: result.insertId, name: classes.name, school_id };
      return successResponse(res, newClass, "Berhasil membuat kelas");
    }
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const updateClasses = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const school_id = await getUserInstitution(req.user.id);

    const [existingRows] = await pool.query(
      "SELECT * FROM classes WHERE id = ? LIMIT 1",
      [parseInt(id)],
    );
    const existingClass = existingRows[0];

    if (!existingClass) {
      return errorResponse(res, 404, "Kelas tidak ditemukan");
    }
    if (existingClass.school_id !== school_id) {
      return errorResponse(res, 403, "Kelas bukan milik sekolah anda");
    }

    const [result] = await pool.query(
      "UPDATE classes SET name = ?, updated_at = NOW() WHERE id = ?",
      [name, parseInt(id)],
    );
    const updatedClass = {
      id: existingClass.id,
      name,
      school_id: existingClass.school_id,
      ...(result.affectedRows !== undefined ? {} : {}),
    };

    if (existingClass.teacher_id) {
      await pool.query(
        "UPDATE teachers SET role = ? WHERE id = ?",
        [name, existingClass.teacher_id],
      );
    }

    return successResponse(res, updatedClass, "Kelas berhasil diperbarui");
  } catch (error) {
    return errorResponse(res, error, "Error saat memperbarui kelas");
  }
};

export const deleteClasses = async (req, res) => {
  const { id } = req.params;

  try {
    const school_id = await getUserInstitution(req.user.id);

    const [existingRows] = await pool.query(
      "SELECT * FROM classes WHERE id = ? LIMIT 1",
      [parseInt(id)],
    );
    const existingClass = existingRows[0];

    if (!existingClass) {
      return errorResponse(res, 404, "Kelas tidak ditemukan");
    }
    if (existingClass.school_id !== school_id) {
      return errorResponse(res, 403, "Kelas bukan milik sekolah anda");
    }

    if (existingClass.teacher_id) {
      await pool.query("UPDATE teachers SET role = NULL WHERE id = ?", [
        existingClass.teacher_id,
      ]);
    }

    await pool.query("DELETE FROM classes WHERE id = ?", [parseInt(id)]);
    return successResponse(res, null, "Kelas berhasil dihapus");
  } catch (error) {
    return errorResponse(res, error, "Error saat menghapus teacher");
  }
};

export const getClassesByInstitution = async (req, res) => {
  const { institutionId } = req.params;

  try {
    const [rows] = await pool.query(
      "SELECT id, name FROM classes WHERE school_id = ? ORDER BY id ASC",
      [Number(institutionId)],
    );
    return successResponse(
      res,
      rows,
      "Kelas berhasil diambil berdasarkan institusi",
    );
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Error saat mengambil kelas berdasarkan institusi",
    );
  }
};
