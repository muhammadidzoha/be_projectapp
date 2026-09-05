import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

export const getCities = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM cities");
    return successResponse(res, rows, "Cities retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve cities");
  }
};

export const getCitiesByProvince = async (req, res) => {
  try {
    const { id } = req.params;
    const [response] = await pool.query(
      "SELECT id, name, province_id FROM cities WHERE province_id = ?",
      [Number(id)],
    );
    return successResponse(
      res,
      response,
      "Berhasil mendapatkan data kota berdasarkan provinsi",
    );
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Gagal mendapatkan data kota berdasarkan provinsi",
    );
  }
};

export const createCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const [result] = await pool.query(
      "INSERT INTO cities (name, province_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
      [name, Number(id)],
    );
    const response = { id: result.insertId, name, province_id: Number(id) };
    return successResponse(res, response, "Berhasil menambahkan kota baru");
  } catch (error) {
    return errorResponse(res, error, "Gagal menambahkan kota baru");
  }
};
