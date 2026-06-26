import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getProvinces = async (req, res) => {
  try {
    const response = await prisma.province.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    return successResponse(res, response, "Province retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve provinces");
  }
};

export const createProvince = async (req, res) => {
  try {
    const { name } = req.body;
    const response = await prisma.province.create({
      data: {name},
    });
    return successResponse(res, response, "Berhasil menambahkan provinsi baru");
  } catch (error) {
    return errorResponse(res, error, "Gagal menambahkan provinsi baru");
  }
}


