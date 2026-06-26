import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const getJobs = async (req, res) => {
  try {
    const jobs = await prisma.job.findMany();
    return successResponse(res, jobs, "Jobs retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve jobs");
  }
};

export const getJobTypes = async (req, res) => {
  try {
    const jobTypes = await prisma.jobType.findMany({
      select: {
        id: true,
        name: true,
        type: true,
      },
    });
    return successResponse(res, jobTypes, "Job types retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve job types");
  }
};
