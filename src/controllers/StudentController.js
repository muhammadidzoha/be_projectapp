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
        nutrition: {
          select: {
            id: true,
            height: true,
            weight: true,
            birthWeight: true,
            bmi: true,
            nutritionStatus: {
              select: {
                id: true,
                information: true,
                status: true,
              },
            },
          },
        },
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

export const getStudentByUser = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;
  const filteredClass = req.query.class || "";

  try {
    const user = req.user;
    if (!user || user.role !== "school") {
      return errorResponse(
        res,
        404,
        "User not found or not associated with an institution"
      );
    }

    const institution = await prisma.institution.findFirst({
      where: {
        user_id: user.id,
      },
    });

    if (!institution) {
      return errorResponse(res, 404, "Institution not found for this user");
    }

    const totalRows = await prisma.familyMember.count({
      where: {
        relation: "ANAK",
        education: "SD",
        fullName: {
          contains: search,
        },
        student: {
          institution: {
            id: institution.id,
          },
          ...(filteredClass && {
            class: {
              name: filteredClass,
            },
          }),
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
        student: {
          institution: {
            id: institution.id,
          },
          ...(filteredClass && {
            class: {
              name: filteredClass,
            },
          }),
        },
      },
      select: {
        id: true,
        fullName: true,
        nutrition: {
          select: {
            id: true,
            height: true,
            weight: true,
            birthWeight: true,
            bmi: true,
            nutritionStatus: {
              select: {
                id: true,
                information: true,
                status: true,
              },
            },
          },
        },
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
