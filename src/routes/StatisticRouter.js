import { Router } from "express";
import { verifyToken } from "../middelware/verifyToken.js";
import { parentStatisticController } from "../controllers/StatisticController.js";

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
