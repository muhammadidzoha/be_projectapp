import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken)
      return errorResponse(res, null, "Refresh token tidak ditemukan");

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.email, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.refresh_token = ?
       LIMIT 1`,
      [refreshToken],
    );
    const user = users[0];
    if (!user) return errorResponse(res, null, "Refresh token tidak valid");

    jwt.verify(
      refreshToken,
      process.env.APP_REFRESH_TOKEN_SECRET,
      (err) => {
        if (err) return errorResponse(res, err, "Refresh token tidak valid");
        const { id, username, email, role_name } = user;
        const accessToken = jwt.sign(
          { id, username, email, role: role_name },
          process.env.APP_ACCESS_TOKEN_SECRET,
          {
            expiresIn: 1800,
          },
        );
        return successResponse(
          res,
          { accessToken },
          "Access token berhasil diperbarui",
        );
      },
    );
  } catch (error) {
    return errorResponse(res, error, "Error refreshing token");
  }
};
