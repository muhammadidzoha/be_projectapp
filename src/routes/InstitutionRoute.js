import { Router } from "express";
import {
  getInstitutions,
  getInstitutionType,
} from "../controllers/InstitutionController.js";

const router = Router();

router.get("/institutionType", getInstitutionType);
router.get("/institutions", getInstitutions);

export default router;
