import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getCities = async (req, res) => {
  try {
    const response = await prisma.city.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    return successResponse(res, response, "Cities retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve cities");
  }
};

export const getCitiesByProvince = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await prisma.city.findMany({
      where: { province_id: Number(id) },
      select: {
        id: true,
        name: true,
        province_id: true,
      }
    });
    return successResponse(res, response, "Berhasil mendapatkan data kota berdasarkan provinsi");
  } catch (error) {
    return errorResponse(res, error, "Gagal mendapatkan data kota berdasarkan provinsi");
  }
}

export const createCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const response = await prisma.city.create({
      data: {
        name,
        province_id: Number(id),
      }
    });
    return successResponse(res, response, "Berhasil menambahkan kota baru");
  } catch (error) {
    return errorResponse(res, error, "Gagal menambahkan kota baru");
  }
}
