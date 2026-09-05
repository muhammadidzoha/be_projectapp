import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const HASH_OPTIONS = { parallelism: 1, memoryCost: 65536, timeCost: 3 };

export const registerParent = async (req, res) => {
  const { username, email, password, role_id } = req.body;

  const hashPassword = await argon2.hash(password, HASH_OPTIONS);

  try {
    const [existingUser] = await pool.query(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, email],
    );

    if (existingUser[0]) {
      return errorResponse(res, null, "Username atau email sudah digunakan");
    }

    const userId = randomUUID();
    const familyId = randomUUID();
    if (!role_id) {
      return errorResponse(res, null, "role_id tidak boleh kosong");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        "INSERT INTO users (id, username, email, password, role_id, refresh_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NOW(), NOW())",
        [userId, username, email, hashPassword, role_id],
      );
      await connection.query(
        "INSERT INTO families (id, userId, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
        [familyId, userId],
      );
      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }

    const newParent = {
      id: userId,
      username,
      email,
      password: hashPassword,
      role_id,
      refresh_token: null,
    };

    return successResponse(res, newParent, "Berhasil membuat akun");
  } catch (error) {
    return errorResponse(res, error, "Error saat membuat akun");
  }
};

export const registerInstitution = async (req, res) => {
  const {
    username,
    email,
    password,
    role_id,
    institutionName,
    institutionEmail,
    institutionPhone,
    institutionAddress,
    institutionProvince,
    institutionCity,
    institutionType,
  } = req.body;

  const hashPassword = await argon2.hash(password, HASH_OPTIONS);

  try {
    const [existingUser] = await pool.query(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, email],
    );
    if (existingUser[0])
      return errorResponse(res, null, "Username atau email sudah digunakan");

    const [existingInstitution] = await pool.query(
      "SELECT id FROM institutions WHERE name = ? OR email = ? OR phone = ? LIMIT 1",
      [institutionName, institutionEmail, institutionPhone],
    );
    if (existingInstitution[0])
      return errorResponse(
        res,
        null,
        "Institusi ini sudah digunakan oleh akun lain",
      );

    const userId = randomUUID();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        "INSERT INTO users (id, username, email, password, role_id, refresh_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NOW(), NOW())",
        [userId, username, email, hashPassword, role_id],
      );
      await connection.query(
        "INSERT INTO institutions (name, email, phone, address, user_id, province_id, city_id, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [
          institutionName,
          institutionEmail,
          institutionPhone,
          institutionAddress,
          userId,
          institutionProvince || null,
          institutionCity || null,
          institutionType,
        ],
      );
      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }

    const [institutionRows] = await pool.query(
      `SELECT u.id AS user_id, u.username, u.email,
              r.name AS role_name,
              i.id AS institution_id, i.name AS institution_name,
              i.email AS institution_email, i.phone AS institution_phone,
              i.address AS institution_address,
              p.id AS province_id, p.name AS province_name,
              c.id AS city_id, c.name AS city_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       JOIN institutions i ON i.user_id = u.id
       LEFT JOIN provinces p ON p.id = i.province_id
       LEFT JOIN cities c ON c.id = i.city_id
       WHERE u.id = ? LIMIT 1`,
      [userId],
    );

    const row = institutionRows[0];
    const newInstitution = {
      id: row.user_id,
      username: row.username,
      email: row.email,
      role: { name: row.role_name },
      institution: {
        id: row.institution_id,
        name: row.institution_name,
        email: row.institution_email,
        phone: row.institution_phone,
        address: row.institution_address,
        province: row.province_id
          ? { id: row.province_id, name: row.province_name }
          : null,
        city: row.city_id ? { id: row.city_id, name: row.city_name } : null,
      },
    };

    return successResponse(res, newInstitution, "Berhasil membuat akun");
  } catch (error) {
    return errorResponse(res, error, "Error saat membuat akun");
  }
};

export const login = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.username, u.email, u.password, u.role_id, u.refresh_token,
              r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.username = ? OR u.email = ?
       LIMIT 1`,
      [req.body.identifier, req.body.identifier],
    );

    const user = users[0];

    if (!user) {
      return errorResponse(res, null, "User tidak ditemukan");
    }

    const match = await argon2.verify(user.password, req.body.password);
    if (!match) return errorResponse(res, null, "Password salah");
    const { id, username, email } = user;
    const roleName = user.role_name;

    const accessToken = jwt.sign(
      { id, username, email, role: roleName },
      process.env.APP_ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env?.NODE_ENV === "production" ? 1800 : 3600 * 3,
      },
    );
    const refreshToken = jwt.sign(
      { id, username, email, role: roleName },
      process.env.APP_REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );
    await pool.query("UPDATE users SET refresh_token = ? WHERE id = ?", [
      refreshToken,
      id,
    ]);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return successResponse(res, { accessToken }, "Login berhasil");
  } catch (error) {
    return errorResponse(res, error, "Terjadi kesalahan saat login");
  }
};

export const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken)
    return errorResponse(res, null, "Refresh token tidak ditemukan");

  const [users] = await pool.query(
    "SELECT id FROM users WHERE refresh_token = ? LIMIT 1",
    [refreshToken],
  );
  const user = users[0];
  if (!user) return errorResponse(res, null, "Refresh token tidak valid");
  const { id } = user;
  await pool.query("UPDATE users SET refresh_token = NULL WHERE id = ?", [id]);
  res.clearCookie("refreshToken");
  return successResponse(res, null, "Logout berhasil");
};
