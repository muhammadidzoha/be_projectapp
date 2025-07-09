import { Router } from "express";
import {
  changeStatusToProcessed,
  createRecommendation,
  getRecomendations,
  getResponseInstitution,
  getResponseParent,
  createIntervention,
  getSingleRecommendation,
  getInterventionsBelongToInstitution,
  getInterventionsBelongToFamily,
  getInterventionById,
} from "../controllers/RecommendationController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/recommendation", getRecomendations);
router.get("/recommendation/:id", getResponseParent);
router.get("/recommendation/single/:id", getSingleRecommendation);
router.get("/recommendation/institution/:id", getResponseInstitution);
router.post("/recommendation/user", verifyToken, createRecommendation);
router.patch("/recommendation/:id", changeStatusToProcessed);
router.post(
  "/recommendation/:id/interventions",
  verifyToken,
  createIntervention
);

// INTERVENTIONS
router.get(
  "/interventions/schools",
  verifyToken,
  getInterventionsBelongToInstitution
);
router.get(
  "/interventions/families",
  verifyToken,
  getInterventionsBelongToFamily
);
router.get("/interventions/:id", getInterventionById);

export default router;
