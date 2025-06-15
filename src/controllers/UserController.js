import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;
  const totalRows = await prisma.user.count({
    where: {
      OR: [
        {
          username: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
          },
        },
      ],
    },
  });
  const totalPage = Math.ceil(totalRows / limit);
  const users = await prisma.user.findMany({
    where: {
      OR: [
        {
          username: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
          },
        },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: {
        select: {
          name: true,
        },
      },
      institution: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      teacher: {
        select: {
          institution: { select: { id: true, name: true, phone: true } },
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
    {
      totalRows,
      totalPage,
      page,
      limit,
      users,
    },
    "Users retrieved successfully"
  );
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!user) {
      return errorResponse(res, null, "User Not Found");
    }
    return successResponse(
      res,
      user,
      `User with ID: ${id} retrieved successfully`
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, error, "Error retrieving user");
  }
};

export const updateUser = async (req, res) => {};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findFirst({
      where: {
        id,
      },
    });

    if (!user) {
      return errorResponse(res, null, "User Not Found");
    }

    if (user.role_id === 1) {
      return errorResponse(res, null, "Cannot delete admin user");
    } else {
      await prisma.user.delete({
        where: {
          id,
        },
      });
    }
    return successResponse(res, 200, "Berhasil menghapus user");
  } catch (error) {
    return errorResponse(res, error, "Gagal menghapus user");
  }
};
