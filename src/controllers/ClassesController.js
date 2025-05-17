import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getClasses = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.class.count({
      where: {
        name: {
          contains: search,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const classes = await prisma.class.findMany({
      where: {
        name: {
          contains: search,
        },
      },
      select: {
        id: true,
        name: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
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
      { totalRows, totalPage, page, limit, classes },
      "Teachers retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const createClasses = async (req, res) => {
  const { classes } = req.body;

  try {
    if (Array.isArray(classes)) {
      const createdClasses = [];
      for (const cls of classes) {
        const existingClass = await prisma.class.findUnique({
          where: { name: cls.name },
        });

        if (!existingClass) {
          const newClass = await prisma.class.create({
            data: { name: cls.name },
          });
          createdClasses.push(newClass);
        }
      }

      return successResponse(res, createdClasses, "Berhasil membuat kelas");
    } else {
      const existingClass = await prisma.class.findUnique({
        where: { name: classes.name },
      });

      if (existingClass) {
        return errorResponse(
          res,
          "Kelas sudah tersedia",
          "Tidak dapat membuat kelas yang sudah ada"
        );
      }

      const newClass = await prisma.class.create({
        data: { name: classes.name },
      });

      return successResponse(res, newClass, "Berhasil membuat kelas");
    }
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const updateClasses = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const existingClass = await prisma.class.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!existingClass) {
      return errorResponse(res, 404, "Kelas tidak ditemukan");
    }

    const updatedClass = await prisma.class.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name,
      },
    });

    if (existingClass.teacher_id) {
      await prisma.teacher.update({
        where: {
          id: existingClass.teacher_id,
        },
        data: {
          role: name,
        },
      });
    }

    return successResponse(res, updatedClass, "Kelas berhasil diperbarui");
  } catch (error) {
    return errorResponse(res, error, "Error saat memperbarui kelas");
  }
};

export const deleteClasses = async (req, res) => {
  const { id } = req.params;

  try {
    const existingClass = await prisma.class.findFirst({
      where: {
        id: parseInt(id),
      },
    });

    if (!existingClass) {
      return errorResponse(res, 404, "Kelas tidak ditemukan");
    }

    if (existingClass.teacher_id) {
      await prisma.teacher.update({
        where: {
          id: existingClass.teacher_id,
        },
        data: {
          role: null,
        },
      });
    }

    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });
    return successResponse(res, null, "Kelas berhasil dihapus");
  } catch (error) {
    return errorResponse(res, error, "Error saat menghapus teacher");
  }
};
