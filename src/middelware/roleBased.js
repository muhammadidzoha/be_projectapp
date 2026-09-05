import pool from "../config/db.js";
import { errorResponse } from "../helpers/ResponseHelper.js";

export const roleBased = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return errorResponse(res, null, "User tidak ditemukan");

      const [user] = await pool.query(
        `SELECT u.id, r.name AS role_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = ?
         LIMIT 1`,
        [req.user.id],
      );

      if (!user[0]) return errorResponse(res, null, "User tidak ditemukan");

      const userRole = user[0].role_name;

      if (typeof roles === "string") {
        roles = [roles];
      }

      if (!roles.includes(userRole)) {
        return errorResponse(res, null, "Akses ditolak");
      }

      next();
    } catch (error) {
      return errorResponse(res, error, "Error checking user role");
    }
  };
};
