import { Router } from "express";
import {
  getInstitutionByUser,
  getInstitutions,
  getInstitutionType,
  getHealthCares,
} from "../controllers/InstitutionController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/institutionType", getInstitutionType);
router.get("/institutions", getInstitutions);
router.get("/institutions/user", verifyToken, getInstitutionByUser);
router.get("/institutions/healthcares", getHealthCares);

export default router;
