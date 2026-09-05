import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { like } from "../utils/dbHelpers.js";

const HASH_OPTIONS = { parallelism: 1, memoryCost: 65536, timeCost: 3 };

export const getTeachers = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;
  const searchLike = like(search);

  try {
    const user = req.user;
    const [instRows] = await pool.query(
      "SELECT id FROM institutions WHERE user_id = ? LIMIT 1",
      [user.id],
    );
    const institution = instRows[0];
    if (!institution) {
      return errorResponse(res, 404, "Institusi tidak ditemukan");
    }

    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM teachers WHERE school_id = ? AND (fullName LIKE ? OR role LIKE ?)",
      [institution.id, searchLike, searchLike],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [rows] = await pool.query(
      `SELECT t.id, t.fullName, t.role, t.address, t.phone,
              u.id AS user_id, u.username, u.email,
              i.id AS institution_id, i.name AS institution_name,
              i.address AS institution_address, i.phone AS institution_phone,
              p.id AS province_id, p.name AS province_name,
              c.id AS city_id, c.name AS city_name
       FROM teachers t
       LEFT JOIN users u ON u.id = t.user_id
       JOIN institutions i ON i.id = t.school_id
       LEFT JOIN provinces p ON p.id = i.province_id
       LEFT JOIN cities c ON c.id = i.city_id
       WHERE t.school_id = ? AND (t.fullName LIKE ? OR t.role LIKE ?)
       ORDER BY t.id DESC LIMIT ? OFFSET ?`,
      [institution.id, searchLike, searchLike, limit, offset],
    );

    const teachers = [];
    for (const row of rows) {
      const [classes] = await pool.query(
        "SELECT id, name FROM classes WHERE teacher_id = ?",
        [row.id],
      );
      teachers.push({
        id: row.id,
        fullName: row.fullName,
        role: row.role,
        address: row.address,
        phone: row.phone,
        user: row.user_id
          ? { id: row.user_id, username: row.username, email: row.email }
          : null,
        institution: {
          id: row.institution_id,
          name: row.institution_name,
          address: row.institution_address,
          phone: row.institution_phone,
          province: row.province_id
            ? { id: row.province_id, name: row.province_name }
            : null,
          city: row.city_id ? { id: row.city_id, name: row.city_name } : null,
        },
        classes,
      });
    }

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, teachers },
      "Teachers retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve teachers");
  }
};

export const createTeacher = async (req, res) => {
  const {
    username,
    email,
    password,
    role_id,
    fullName,
    role,
    classId,
    address,
    phone,
  } = req.body;

  const hashPassword = await argon2.hash(password, HASH_OPTIONS);

  try {
    const user = req.user;
    const [instRows] = await pool.query(
      "SELECT * FROM institutions WHERE user_id = ? LIMIT 1",
      [user.id],
    );
    const institution = instRows[0];
    if (!institution) {
      return errorResponse(res, 404, "Institusi tidak ditemukan");
    }

    if (classId) {
      const [classRows] = await pool.query(
        "SELECT * FROM classes WHERE id = ? LIMIT 1",
        [classId],
      );
      const existingClass = classRows[0];
      if (!existingClass) {
        return errorResponse(res, null, "Kelas tidak ditemukan");
      }
      if (existingClass.teacher_id) {
        return errorResponse(res, null, "Kelas sudah memiliki wali kelas");
      }
    } else {
      return errorResponse(res, null, "ID kelas harus disertakan");
    }

    const [existingUserRows] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, email],
    );
    const existingUser = existingUserRows[0];

    const buildTeacherSelect = async (userRow, teacherId) => {
      const [tRows] = await pool.query(
        `SELECT t.id, t.fullName, t.role,
                i.id AS institution_id, i.name AS institution_name,
                it.id AS itype_id, it.name AS itype_name,
                i.address AS institution_address,
                c.id AS city_id, c.name AS city_name,
                p.id AS province_id, p.name AS province_name
         FROM teachers t
         JOIN institutions i ON i.id = t.school_id
         LEFT JOIN institution_types it ON it.id = i.type
         LEFT JOIN cities c ON c.id = i.city_id
         LEFT JOIN provinces p ON p.id = i.province_id
         WHERE t.id = ? LIMIT 1`,
        [teacherId],
      );
      const t = tRows[0];
      return {
        id: userRow.id,
        username: userRow.username,
        email: userRow.email,
        role_id: userRow.role_id,
        teacher: {
          id: t.id,
          fullName: t.fullName,
          role: t.role,
          institution: {
            id: t.institution_id,
            name: t.institution_name,
            institution_type: t.itype_id
              ? { id: t.itype_id, name: t.itype_name }
              : null,
            address: t.institution_address,
            city: t.city_id ? { id: t.city_id, name: t.city_name } : null,
            province: t.province_id
              ? { id: t.province_id, name: t.province_name }
              : null,
          },
        },
      };
    };

    if (existingUser) {
      const [teacherRows] = await pool.query(
        "SELECT * FROM teachers WHERE user_id = ? LIMIT 1",
        [existingUser.id],
      );
      if (teacherRows[0]) {
        return errorResponse(res, null, "Username atau email sudah digunakan");
      }

      const teacherId = randomUUID();
      await pool.query(
        "INSERT INTO teachers (id, fullName, role, address, phone, user_id, school_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, fullName, role, address, phone, existingUser.id, institution.id],
      );

      await pool.query("UPDATE classes SET teacher_id = ? WHERE id = ?", [
        teacherId,
        classId,
      ]);

      const updateUser = await buildTeacherSelect(existingUser, teacherId);
      return successResponse(
        res,
        updateUser,
        "Berhasil menambahkan wali kelas",
      );
    } else {
      const userId = randomUUID();
      await pool.query(
        "INSERT INTO users (id, username, email, password, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
        [userId, username, email, hashPassword, role_id],
      );

      const teacherId = randomUUID();
      await pool.query(
        "INSERT INTO teachers (id, fullName, role, address, phone, user_id, school_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [teacherId, fullName, role, address, phone, userId, institution.id],
      );

      await pool.query("UPDATE classes SET teacher_id = ? WHERE id = ?", [
        teacherId,
        classId,
      ]);

      const newUserRow = {
        id: userId,
        username,
        email,
        role_id,
      };
      const newTeacher = await buildTeacherSelect(newUserRow, teacherId);
      return successResponse(
        res,
        newTeacher,
        "Berhasil menambahkan wali kelas",
      );
    }
  } catch (error) {
    return errorResponse(res, error, "Error saat menambahkan wali kelas");
  }
};

export const updateTeacher = async (req, res) => {
  const { id } = req.params;
  const { role, address, phone } = req.body;

  try {
    const user = req.user;
    const [instRows] = await pool.query(
      "SELECT id FROM institutions WHERE user_id = ? LIMIT 1",
      [user.id],
    );
    const institution = instRows[0];
    if (!institution) {
      return errorResponse(res, 404, "Institusi tidak ditemukan");
    }

    const [teacherRows] = await pool.query(
      "SELECT * FROM teachers WHERE id = ? LIMIT 1",
      [id],
    );
    const existingTeacher = teacherRows[0];
    if (!existingTeacher) {
      return errorResponse(res, 404, "Guru tidak ditemukan");
    }
    if (existingTeacher.school_id !== institution.id) {
      return errorResponse(res, 403, "Guru bukan milik sekolah anda");
    }

    const [oldClassRows] = await pool.query(
      "SELECT * FROM classes WHERE teacher_id = ? LIMIT 1",
      [id],
    );
    const oldClass = oldClassRows[0];
    if (oldClass) {
      await pool.query("UPDATE classes SET teacher_id = NULL WHERE id = ?", [
        oldClass.id,
      ]);
    }

    const [newClassRows] = await pool.query(
      "SELECT * FROM classes WHERE name = ? LIMIT 1",
      [role],
    );
    const newClass = newClassRows[0];
    if (!newClass) {
      return errorResponse(res, 404, "Kelas baru tidak ditemukan");
    }

    await pool.query("UPDATE classes SET teacher_id = ? WHERE id = ?", [
      id,
      newClass.id,
    ]);

    await pool.query(
      "UPDATE teachers SET role = ?, address = ?, phone = ?, updated_at = NOW() WHERE id = ?",
      [role, address, phone, id],
    );

    return successResponse(
      res,
      { id, role, address, phone },
      "Guru berhasil diperbarui",
    );
  } catch (error) {
    return errorResponse(res, error, "Error saat memperbarui guru");
  }
};

export const deleteTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const user = req.user;
    const [instRows] = await pool.query(
      "SELECT id FROM institutions WHERE user_id = ? LIMIT 1",
      [user.id],
    );
    const institution = instRows[0];
    if (!institution) {
      return errorResponse(res, 404, "Institusi tidak ditemukan");
    }

    const [teacherRows] = await pool.query(
      "SELECT * FROM teachers WHERE id = ? LIMIT 1",
      [id],
    );
    const existingTeacher = teacherRows[0];
    if (!existingTeacher) {
      return errorResponse(res, 404, "Guru tidak ditemukan");
    }
    if (existingTeacher.school_id !== institution.id) {
      return errorResponse(res, 403, "Guru bukan milik sekolah anda");
    }

    if (existingTeacher.user_id) {
      await pool.query("DELETE FROM users WHERE id = ?", [
        existingTeacher.user_id,
      ]);
    }

    return successResponse(res, null, "Guru berhasil dihapus");
  } catch (error) {
    return errorResponse(res, error, "Error saat menghapus teacher");
  }
};
