import { Router } from "express";
import {
  changeStatusToProcessed,
  createRecommendation,
  getRecomendations,
  getResponseInstitution,
  getResponseParent,
} from "../controllers/RecommendationController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/recommendation", getRecomendations);
router.get("/recommendation/:id", getResponseParent);
router.get("/recommendation/institution/:id", getResponseInstitution);
router.post("/recommendation/user", verifyToken, createRecommendation);
router.patch("/recommendation/:id", changeStatusToProcessed);

export default router;
