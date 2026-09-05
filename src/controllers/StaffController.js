import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import pool from "../config/db.js";
import { errorResponse } from "../helpers/ResponseHelper.js";
import { like } from "../utils/dbHelpers.js";

const HASH_OPTIONS = { parallelism: 1, memoryCost: 65536, timeCost: 3 };

const getUserInstitution = async (userId) => {
  const [rows] = await pool.query(
    "SELECT i.id FROM users u JOIN institutions i ON i.user_id = u.id WHERE u.id = ? LIMIT 1",
    [userId],
  );
  if (!rows[0]) {
    throw new Error("user tidak ditemukan");
  }
  return rows[0].id;
};

export const addStaff = async (req, res) => {
  try {
    const user = req.user;
    const institutionId = await getUserInstitution(user.id);
    const { fullName, address, phone, email, password, username } = req.body;
    const hashedPassword = await argon2.hash(password, HASH_OPTIONS);

    const [existingRows] = await pool.query(
      "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, email],
    );
    if (existingRows[0]) {
      throw new Error("User sudah ada");
    }

    const userId = randomUUID();
    const staffId = randomUUID();
    const conn = await pool.getConnection();
    let newUser;
    try {
      await conn.beginTransaction();
      await conn.query(
        "INSERT INTO users (id, username, email, password, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, 6, NOW(), NOW())",
        [userId, username, email, hashedPassword],
      );
      await conn.query(
        "INSERT INTO staffs (id, fullName, address, phone, user_id, healthcare_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'staff', NOW(), NOW())",
        [staffId, fullName, address, phone, userId, institutionId],
      );
      await conn.commit();
      newUser = { id: userId, username, email, staff: { id: staffId, fullName, address, phone, healthcare_id: institutionId, role: "staff" } };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.status(201).json({
      status: "Success",
      message: "User berhasil dibuat",
      data: newUser,
    });
  } catch (err) {
    return errorResponse(res, err, "Gagal menambahkan staff");
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id dibutuhkan untuk menghapus staff");
    }
    const user = req.user;
    const institutionId = await getUserInstitution(user.id);

    const [staffRows] = await pool.query(
      "SELECT * FROM staffs WHERE id = ? LIMIT 1",
      [id],
    );
    const existingStaff = staffRows[0];
    if (!existingStaff) {
      throw new Error("Staff tidak ditemukan");
    }
    if (existingStaff.healthcare_id !== institutionId) {
      throw new Error("Tidak bisa menghapus akun institusi lain");
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM staffs WHERE id = ?", [id]);
      if (existingStaff.user_id) {
        await conn.query("DELETE FROM users WHERE id = ?", [existingStaff.user_id]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.status(200).json({
      status: "Success",
      message: "Berhasil menghapus staff",
      data: existingStaff,
    });
  } catch (err) {
    return errorResponse(res, err, "Terjadi kesalahan saat menghapus staff");
  }
};

export const updateStafff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id dibutuhkan");
    }
    const user = req.user;
    const institutionId = await getUserInstitution(user.id);
    const { fullName, address, phone, username, email, password } = req.body;

    const [staffRows] = await pool.query(
      "SELECT * FROM staffs WHERE id = ? LIMIT 1",
      [id],
    );
    const existingStaff = staffRows[0];
    if (!existingStaff || !existingStaff.user_id) {
      throw new Error("User tidak ditemukan");
    }

    const newPassword = password
      ? await argon2.hash(password, HASH_OPTIONS)
      : null;

    const conn = await pool.getConnection();
    let updatedUser;
    try {
      await conn.beginTransaction();
      await conn.query(
        "UPDATE staffs SET fullName = ?, address = ?, phone = ?, healthcare_id = ?, role = 'staff', updated_at = NOW() WHERE id = ?",
        [fullName, address, phone, institutionId, id],
      );
      const sets = ["updated_at = NOW()"];
      const params = [];
      if (username) {
        sets.push("username = ?");
        params.push(username);
      }
      if (email) {
        sets.push("email = ?");
        params.push(email);
      }
      if (newPassword) {
        sets.push("password = ?");
        params.push(newPassword);
      }
      params.push(existingStaff.user_id);
      await conn.query(
        `UPDATE users SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      await conn.commit();
      updatedUser = {
        id: existingStaff.user_id,
        username,
        email,
        staff: {
          id,
          fullName,
          address,
          phone,
          healthcare_id: institutionId,
          role: "staff",
        },
      };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.status(201).json({
      status: "Success",
      message: "User berhasil diupdate",
      data: updatedUser,
    });
  } catch (err) {
    return errorResponse(res, err, "Gagal Mengubah staff");
  }
};

export const getStaffs = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword ?? "";
    const skip = limit * page;
    const searchLike = like(keyword);

    const [instRows] = await pool.query(
      "SELECT i.id FROM users u JOIN institutions i ON i.user_id = u.id WHERE u.id = ? LIMIT 1",
      [user.id],
    );
    const userInstitution = instRows[0];
    if (!userInstitution) {
      throw new Error("User tidak di institusi manapun");
    }

    let totalRows;
    let staffs;
    if (keyword !== "") {
      const [[cRow]] = await pool.query(
        "SELECT COUNT(*) AS total FROM staffs WHERE healthcare_id = ? AND fullName LIKE ?",
        [userInstitution.id, searchLike],
      );
      totalRows = cRow.total;
      const [rows] = await pool.query(
        "SELECT * FROM staffs WHERE healthcare_id = ? AND fullName LIKE ? LIMIT ? OFFSET ?",
        [userInstitution.id, searchLike, limit, skip],
      );
      staffs = rows;
    } else {
      const [[cRow]] = await pool.query(
        "SELECT COUNT(*) AS total FROM staffs WHERE healthcare_id = ?",
        [userInstitution.id],
      );
      totalRows = cRow.total;
      const [rows] = await pool.query(
        "SELECT * FROM staffs WHERE healthcare_id = ? LIMIT ? OFFSET ?",
        [userInstitution.id, limit, skip],
      );
      staffs = rows;
    }

    const totalPages = Math.ceil(totalRows / limit);

    res.status(200).json({
      status: "Success",
      message: "Berhasil mendapatkan data",
      data: { staffs, page, limit, totalPages, totalRows },
    });
  } catch (err) {
    return errorResponse(res, err, "Gagal mendapatkan staff");
  }
};
