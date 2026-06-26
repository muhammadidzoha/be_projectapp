import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getPartners = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const user = req.user;
    const institution = await prisma.institution.findUnique({
      where: { user_id: user.id },
    });

    if (!institution) return errorResponse(res, null, "Institution not found");

    const where = {
      schoolId: institution.id,
      ...(search
        ? {
            healthcare: {
              OR: [
                { name: { contains: search } },
                { address: { contains: search } },
                { phone: { contains: search } },
              ],
            },
          }
        : {}),
    };

    const totalRows = await prisma.partnership.count({ where });
    const totalPage = Math.ceil(totalRows / limit);

    const partnerships = await prisma.partnership.findMany({
      where,
      include: {
        healthcare: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, partnerships },
      "Partners retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get partners");
  }
};

export const addPartners = async (req, res) => {
  try {
    const user = req.user;
    const { healthcareIds } = req.body;

    if (!Array.isArray(healthcareIds) || healthcareIds.length === 0) {
      return errorResponse(
        res,
        null,
        "healthcareIds must be a non-empty array",
      );
    }

    const institution = await prisma.institution.findUnique({
      where: { user_id: user.id },
    });

    if (!institution) return errorResponse(res, null, "Institution not found");

    const data = healthcareIds.map((healthcareId) => ({
      schoolId: institution.id,
      healthcareId,
    }));

    await prisma.partnership.createMany({ data, skipDuplicates: true });

    return successResponse(res, null, "Partners added successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to add partners");
  }
};

export const deletePartner = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.partnership.delete({ where: { id } });
    return successResponse(res, null, "Partner removed successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to remove partner");
  }
};
