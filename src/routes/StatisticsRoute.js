import { Router } from "express";
import { getAdminDashboardSummary, getParentDashboardSummary, getSchoolDashboardSummary } from "../controllers/StatisticsController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/statistics/admin/dashboard/summary", verifyToken, getAdminDashboardSummary);
router.get("/statistics/parents/dashboard/summary", verifyToken, getParentDashboardSummary);
router.get("/statistics/school/dashboard/summary", verifyToken, getSchoolDashboardSummary);

export default router;
