import { Router } from "express";
import { getJobs, getJobTypes } from "../controllers/JobController.js";

const router = Router();

router.get("/jobs", getJobs);
router.get("/job-types", getJobTypes);

export default router;
