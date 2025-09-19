import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient({
  errorFormat: "pretty",
  log: ["error", "query"],
});

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
    const user = req.user;
    if (user.role !== "admin") {
      res.status(403).json({
        status: "Fail",
        message: "User dont have access to this resource",
      });
    }
    const { name } = req.body;
    if (!name) {
      throw new Error("Name is required");
    }
    console.log({ name });
    const isExists = await prisma.province.findFirst({
      where: {
        name,
      },
    });
    if (isExists) {
      throw new Error("Province is already exists");
    }

    const newProvince = await prisma.province.create({
      data: {
        name,
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

export const addCity = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "admin") {
      res.status(403).json({
        status: "Fail",
        message: "User dont have access to this resource",
      });
    }
    const { province } = req.params;
    const { name } = req.body;
    if (!name) {
      res.status(400).json({
        status: "Fail",
        message: "Name is required",
      });
    }

    const isExists = await prisma.city.findFirst({
      where: {
        name,
        province_id: +province,
      },
    });

    if (isExists) {
      res.status(400, {
        status: "fail",
        message: "City already exists",
      });
    }

    const newCity = await prisma.city.create({
      data: {
        name,
        province_id: +province,
      },
    });

    console.log({ newCity });
    res.status(201).json({
      status: "Success",
      message: "City created",
      data: newCity,
    });
  } catch (err) {
    console.log({ err });
    return errorResponse(res, err);
  }
};

export const getCitiesByProvince = async (req, res) => {
  try {
    const { province } = req.params;
    if (!province) {
      throw new Error("Province id is required");
    }
    const response = await prisma.city.findMany({
      where: {
        province_id: Number(province),
      },
      select: {
        id: true,
        name: true,
        province_id: true,
      },
    });
    return successResponse(res, response, "Cities retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve cities");
  }
};
