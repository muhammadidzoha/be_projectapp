import { Router } from "express";
import { verifyToken } from "../middelware/verifyToken.js";
import {
  parentStatisticController,
  schoolStatisticController,
} from "../controllers/StatisticController.js";

export const statisticRouter = Router();

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
