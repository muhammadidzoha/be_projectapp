import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { errorResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient({
  log: ["error"],
  errorFormat: "pretty",
});

const getUserInstitution = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      institution: {
        select: {
          id: true,
        },
      },
    },
  });
  if (!user) {
    throw new Error("user tidak ditemukan");
  }

  return user.institution.id;
};

export const addStaff = async (req, res) => {
  try {
    const user = req.user;
    const institutionId = await getUserInstitution(user.id);
    const { fullName, address, phone, email, password, username } = req.body;
    const hashedPassword = await argon2.hash(password);
    const isUserExist = await prisma.user.findFirst({
      where: {
        username,
        email,
      },
    });
    console.log({ isUserExist });
    if (!!isUserExist) {
      throw new Error("User sudah ada");
    }
    const newUser = await prisma.$transaction(async (trx) => {
      const staff = await trx.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          role: {
            connectOrCreate: {
              where: {
                id: 6,
              },
              create: { name: "staff" },
            },
          },
          staff: {
            create: {
              fullName,
              address,
              phone,
              healthcare_id: institutionId,
              role: "staff",
            },
          },
        },
        include: {
          staff: true,
        },
      });

      return staff;
    });

    res.status(201).json({
      status: "Success",
      message: "User berhasil dibuat",
      data: newUser,
    });
  } catch (err) {
    return errorResponse(res, err, "Gagal menambahkan staff");
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id dibutuhkan untuk menghapus staff");
    }
    const user = req.user;
    const institutionId = await getUserInstitution(user.id);
    const existingStaff = await prisma.staff.findUnique({
      where: {
        id,
      },
    });
    if (!existingStaff) {
      throw new Error("Staff tidak ditemukan");
    }
    if (existingStaff.healthcare_id !== institutionId) {
      throw new Error("Tidak bisa menghapus akun institusi lain");
    }
    const deletedStaff = await prisma.staff.delete({
      where: {
        id,
      },
    });
    res.status(200).json({
      status: "Success",
      message: "Berhasil menghapus staff",
      data: deletedStaff,
    });
  } catch (err) {
    return errorResponse(res, err, "Terjadi kesalahan saat menghapus staff");
  }
};

export const updateStafff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id dibutuhkan");
    }
    const user = req.user;
    const institutionId = await getUserInstitution(user.id);
    const { fullName, address, phone, username, email, password } = req.body;
    const hashedPassword = await argon2.hash(password);
    const isUserExist = await prisma.staff.findUnique({
      where: {
        id,
      },
      include: { user: true },
    });
    if (!isUserExist.user_id) {
      throw new Error("User tidak ditemukan");
    }
    const updatedUser = await prisma.$transaction(async (trx) => {
      const updatedStaff = await trx.staff.update({
        where: {
          id,
        },
        data: {
          fullName,
          address,
          phone,
          healthcare_id: institutionId,
          role: "staff",
        },
      });
      return await trx.user.update({
        where: {
          id: isUserExist.user_id,
        },
        data: {
          username,
          email,
          password: hashedPassword,
        },
        include: {
          staff: true,
        },
      });
    });

    res.status(201).json({
      status: "Success",
      message: "User berhasil diupdate",
      data: updatedUser,
    });
  } catch (err) {
    return errorResponse(res, err, "Gagal menambahkan staff");
  }
};

export const getStaffs = async (req, res) => {
  try {
    const user = req.user;
    const userInstitution = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        institution: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!userInstitution) {
      throw new Error("User tidak di institusi manapun");
    }
    const staffs = await prisma.staff.findMany({
      where: {
        healthcare_id: userInstitution.institution?.id,
      },
    });

    res.status(200).json({
      status: "Success",
      message: "Berhasil mendapatkan data",
      data: staffs,
    });
  } catch (err) {
    return errorResponse(res, err, "Gagal menambahkan staff");
  }
};
