import { Router } from "express";
import {
  getInstitutionByUser,
  getInstitutions,
  getInstitutionType,
} from "../controllers/InstitutionController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/institutionType", getInstitutionType);
router.get("/institutions", getInstitutions);
router.get("/institutions/user", verifyToken, getInstitutionByUser);

export default router;
