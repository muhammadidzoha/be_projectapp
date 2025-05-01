import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getCategory = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.category.count({
      where: {
        name: {
          contains: search,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const categories = await prisma.category.findMany({
      where: {
        name: {
          contains: search,
        },
      },
      select: {
        id: true,
        name: true,
        path: true,
      },
      skip: offset,
      take: limit,
      orderBy: {
        id: "desc",
      },
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, categories },
      "Categories retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};
