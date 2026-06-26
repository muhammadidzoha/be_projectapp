import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import argon2 from "argon2";

const prisma = new PrismaClient();

export const getTeachers = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.teacher.count({
      where: {
        OR: [
          {
            fullName: {
              contains: search,
            },
          },
          {
            role: {
              contains: search,
            },
          },
        ],
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const teachers = await prisma.teacher.findMany({
      where: {
        OR: [
          {
            fullName: {
              contains: search,
            },
          },
          {
            role: {
              contains: search,
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        address: true,
        phone: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
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
        classes: {
          select: {
            id: true,
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
      { totalRows, totalPage, page, limit, teachers },
      "Teachers retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve teachers");
  }
};

export const createTeacher = async (req, res) => {
  const {
    username,
    email,
    password,
    role_id,
    fullName,
    role,
    classId,
    address,
    phone,
  } = req.body;

  const hashPassword = await argon2.hash(password);

  try {
    const user = req.user;
    const institution = await prisma.institution.findFirst({
      where: {
        user_id: user.id,
      },
    });

    if (!institution) {
      return errorResponse(res, 404, "Institusi tidak ditemukan");
    }

    if (classId) {
      const existingClass = await prisma.class.findFirst({
        where: { id: classId },
      });

      if (!existingClass) {
        return errorResponse(res, null, "Kelas tidak ditemukan");
      }

      if (existingClass.teacher_id) {
        return errorResponse(res, null, "Kelas sudah memiliki wali kelas");
      }
    } else {
      return errorResponse(res, null, "ID kelas harus disertakan");
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      include: { teacher: true },
    });

    if (existingUser) {
      if (existingUser.teacher) {
        return errorResponse(res, null, "Username atau email sudah digunakan");
      }

      const updateUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          teacher: {
            create: {
              fullName,
              role,
              address,
              phone,
              institution: {
                connect: {
                  id: institution.id,
                },
              },
            },
          },
        },
        select: {
          id: true,
          username: true,
          email: true,
          role_id: true,
          teacher: {
            select: {
              id: true,
              fullName: true,
              role: true,
              institution: {
                select: {
                  id: true,
                  name: true,
                  institution_type: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  address: true,
                  city: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  province: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      await prisma.class.update({
        where: {
          id: classId,
        },
        data: {
          teacher_id: updateUser.teacher.id,
        },
      });
      return successResponse(
        res,
        updateTeacher,
        "Berhasil menambahkan wali kelas"
      );
    } else {
      const newTeacher = await prisma.user.create({
        data: {
          username,
          email,
          password: hashPassword,
          role_id: role_id,
          teacher: {
            create: {
              fullName,
              role,
              address,
              phone,
              institution: {
                connect: {
                  id: institution.id,
                },
              },
            },
          },
        },
        select: {
          id: true,
          username: true,
          email: true,
          role_id: true,
          teacher: {
            select: {
              id: true,
              fullName: true,
              role: true,
              institution: {
                select: {
                  id: true,
                  name: true,
                  institution_type: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  address: true,
                  city: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  province: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      await prisma.class.update({
        where: {
          id: classId,
        },
        data: {
          teacher_id: newTeacher.teacher.id,
        },
      });

      return successResponse(
        res,
        newTeacher,
        "Berhasil menambahkan wali kelas"
      );
    }
  } catch (error) {
    return errorResponse(res, error, "Error saat menambahkan wali kelas");
  }
};

export const updateTeacher = async (req, res) => {
  const { id } = req.params;

  const { role, address, phone } = req.body;

  try {
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id,
      },
    });

    if (!existingTeacher) {
      return errorResponse(res, 404, "Guru tidak ditemukan");
    }

    const oldClass = await prisma.class.findFirst({
      where: {
        teacher_id: id,
      },
    });

    if (oldClass) {
      await prisma.class.update({
        where: { id: oldClass.id },
        data: { teacher_id: null },
      });
    }

    const newClass = await prisma.class.findFirst({
      where: { name: role },
    });

    if (!newClass) {
      return errorResponse(res, 404, "Kelas baru tidak ditemukan");
    }

    await prisma.class.update({
      where: { id: newClass.id },
      data: { teacher_id: id },
    });

    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: {
        role,
        address,
        phone,
      },
    });

    return successResponse(res, updatedTeacher, "Guru berhasil diperbarui");
  } catch (error) {
    return errorResponse(res, error, "Error saat memperbarui guru");
  }
};

export const deleteTeacher = async (req, res) => {
  const { id } = req.params;

  try {
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id,
      },
    });

    if (!existingTeacher) {
      return errorResponse(res, 404, "Guru tidak ditemukan");
    }

    if (existingTeacher.user_id) {
      await prisma.user.delete({
        where: {
          id: existingTeacher.user_id,
        },
      });
    }

    return successResponse(res, null, "Guru berhasil dihapus");
  } catch (error) {
    return errorResponse(res, error, "Error saat menghapus teacher");
  }
};
