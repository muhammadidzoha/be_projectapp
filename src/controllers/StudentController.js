import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getStudents = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.familyMember.count({
      where: {
        relation: "ANAK",
        education: "SD",
        fullName: {
          contains: search,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const students = await prisma.familyMember.findMany({
      where: {
        relation: "ANAK",
        education: "SD",
        fullName: {
          contains: search,
        },
      },
      select: {
        id: true,
        fullName: true,
        student: {
          select: {
            id: true,
            nis: true,
            schoolYear: true,
            semester: true,
            institution: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                province: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                city: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            class: {
              select: {
                id: true,
                name: true,
                teacher: {
                  select: {
                    id: true,
                    fullName: true,
                    address: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: {
        id: "asc",
      },
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, students },
      "Students retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve students");
  }
};
