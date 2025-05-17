import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getInstitutions = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.institution.count({
      where: {
        OR: [
          {
            name: {
              contains: search,
            },
          },
          {
            address: {
              contains: search,
            },
          },
          {
            province: {
              name: {
                contains: search,
              },
            },
          },
          {
            city: {
              name: {
                contains: search,
              },
            },
          },
        ],
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const institutions = await prisma.institution.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
            },
          },
          {
            address: {
              contains: search,
            },
          },
          {
            province: {
              name: {
                contains: search,
              },
            },
          },
          {
            city: {
              name: {
                contains: search,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        province: {
          select: {
            name: true,
          },
        },
        city: {
          select: {
            name: true,
          },
        },
        institution_type: {
          select: {
            name: true,
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: {
        id: "desc",
      },
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, institutions },
      "Institutions retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const getInstitutionByUser = async (req, res) => {
  try {
    const user = req.user;
    const institution = await prisma.institution.findFirst({
      where: {
        user_id: user.id,
      },
    });

    if (!institution) {
      return errorResponse(res, 404, "Institution not found");
    }

    return successResponse(
      res,
      institution,
      "Institution retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const getInstitutionType = async (req, res) => {
  try {
    const institutionTypes = await prisma.institutionType.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    if (institutionTypes.length === 0) {
      return errorResponse(res, 404, "No institution types found");
    }
    return successResponse(
      res,
      institutionTypes,
      "Institution types retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};
