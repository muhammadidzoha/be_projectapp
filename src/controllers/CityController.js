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
