import { Router } from "express";
import {
  createFamilyMember,
  getFamily,
  getFamilyMemberByUser,
} from "../controllers/FamilyController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/family", getFamily);
router.get("/families/user", verifyToken, getFamilyMemberByUser);
router.post("/families/user", verifyToken, createFamilyMember);

export default router;
