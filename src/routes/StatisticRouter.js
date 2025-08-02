import { Router } from "express";
import { verifyToken } from "../middelware/verifyToken.js";
import {
  parentStatisticController,
  puskesmasStatisticController,
  schoolStatisticController,
  adminStatisticController,
} from "../controllers/StatisticController.js";

export const statisticRouter = Router();

// PARENTS
statisticRouter.get(
  "/statistics/parents/nutritions",
  verifyToken,
  parentStatisticController.getEachStatisticCount
);

statisticRouter.get(
  "/statistics/parents/nutritions/childrens",
  verifyToken,
  parentStatisticController.getChildNutritionGrowthLastTwoWeek
);

statisticRouter.get(
  "/statistics/parents/interventions/count",
  verifyToken,
  parentStatisticController.getInterventionCount
);

statisticRouter.get(
  "/statistics/parents/quisioners/status",
  verifyToken,
  parentStatisticController.getQuisionerStatus
);

statisticRouter.get(
  "/statistics/parents/dashboard/summary",
  verifyToken,
  parentStatisticController.getDashboardSummary
);

// School
statisticRouter.get(
  "/statistics/schools/interventions/status",
  verifyToken,
  schoolStatisticController.getEachInterventionStatusCount
);

statisticRouter.get(
  "/statistics/schools/interventions/handled",
  verifyToken,
  schoolStatisticController.getTotalRecommendationAndIntervention
);

statisticRouter.get(
  "/statistics/schools/demografi",
  verifyToken,
  schoolStatisticController.getDemografiDistribution
);

statisticRouter.get(
  "/statistics/schools/nutritions/classes",
  verifyToken,
  schoolStatisticController.getTotalStudentWithNutritionProblem
);

statisticRouter.get(
  "/statistics/schools/quisioners/unfilled",
  verifyToken,
  schoolStatisticController.getUnfilledQuisionerFamilyCount
);

statisticRouter.get(
  "/statistics/schools/students",
  verifyToken,
  schoolStatisticController.getTotalStudent
);

statisticRouter.get(
  "/statistics/schools/teachers",
  verifyToken,
  schoolStatisticController.getTotalTeacher
);

// Puskesmas
statisticRouter.get(
  "/statistics/healthcare/interventions",
  verifyToken,
  puskesmasStatisticController.getTotalInterventions
);

statisticRouter.get(
  "/statistics/healthcare/nutritions/distribution",
  verifyToken,
  puskesmasStatisticController.getNutritionDistributionBySchool
);

statisticRouter.get(
  "/statistics/healthcare/responses/averages",
  verifyToken,
  puskesmasStatisticController.getAvgResponseScoreByCategory
);

// ADMIN

// ✅ Nutrisi berdasarkan region
statisticRouter.get(
  "/statistics/admin/nutrition-by-region",
  adminStatisticController.getNutritionStatusByRegion
);

// ✅ Nutrisi berdasarkan sekolah
statisticRouter.get(
  "/statistics/admin/nutrition-by-school",
  adminStatisticController.getNutritionStatusBySchool
);

// ✅ Total rekomendasi
statisticRouter.get(
  "/statistics/admin/total-recommendation",
  adminStatisticController.getTotalRecommendation
);

// ✅ Status rekomendasi (done, pending, etc.)
statisticRouter.get(
  "/statistics/admin/recommendation-status",
  adminStatisticController.getRecommendationStatusCount
);

// ✅ Total intervensi
statisticRouter.get(
  "/statistics/admin/total-intervention",
  adminStatisticController.getTotalIntervention
);

// ✅ Intervensi berdasarkan faskes
statisticRouter.get(
  "/statistics/admin/intervention-by-healthcare",
  adminStatisticController.getInterventionByEachHealthcare
);

// ✅ Total user berdasarkan peran
statisticRouter.get(
  "/statistics/admin/user-by-role",
  adminStatisticController.getTotalUserByRole
);

// ✅ Total institusi
statisticRouter.get(
  "/statistics/admin/total-institution",
  adminStatisticController.getTotalInstitution
);

// ✅ Intervensi tiap region
statisticRouter.get(
  "/statistics/admin/intervention-by-region",
  adminStatisticController.getTotalInterventionEachRegion
);

// ✅ Status nutrisi tiap region (total anak yg terdata)
statisticRouter.get(
  "/statistics/admin/nutrition-each-region",
  adminStatisticController.getNutritionStatusEachRegion
);

// ✅ Kuisioner yang belum diisi & sudah diisi (keluarga dan institusi)
statisticRouter.get(
  "/statistics/admin/quisioner-status",
  adminStatisticController.getUnfilledQuisioner
);

// ✅ Distribusi status gizi
statisticRouter.get(
  "/statistics/admin/nutrition-distribution",
  adminStatisticController.getNutritionDistribution
);
