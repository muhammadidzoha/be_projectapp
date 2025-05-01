import { PrismaClient } from "@prisma/client";
import { errorResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const roleBased = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return errorResponse(res, null, "User tidak ditemukan");

      const user = await prisma.user.findFirst({
        where: {
          id: req.user.id,
        },
        include: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!user) return errorResponse(res, null, "User tidak ditemukan");

      const userRole = user.role.name;

      if (typeof roles === "string") {
        roles = [roles];
      }

      if (!roles.includes(userRole)) {
        return errorResponse(res, null, "Akses ditolak");
      }

      next();
    } catch (error) {
      return errorResponse(res, error, "Error checking user role");
    }
  };
};
