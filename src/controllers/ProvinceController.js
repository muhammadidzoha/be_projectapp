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
