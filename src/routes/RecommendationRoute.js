import { Router } from "express";
import {
  changeStatusToProcessed,
  createRecommendation,
  getRecomendations,
} from "../controllers/RecommendationController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/recommendation", getRecomendations);
router.post("/recommendation/user", verifyToken, createRecommendation);
router.patch("/recommendation/:id", changeStatusToProcessed);

export default router;
