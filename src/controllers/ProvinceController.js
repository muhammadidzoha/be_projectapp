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

export const addProvinces = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      throw new Error("Name is required");
    }
    const isExists = await prisma.province.findFirst({
      where: {
        name: name.toLowerCase(),
      },
    });
    if (!isExists) {
      throw new Error("Province is already exists");
    }

    const newProvince = await prisma.province.create({
      data: {
        name: name.toLowerCase(),
      },
    });
    res.status(201).json({
      status: "Success",
      message: "Province added",
      data: newProvince,
    });
  } catch (err) {
    return errorResponse(res, err, "Failed to add province");
  }
};
