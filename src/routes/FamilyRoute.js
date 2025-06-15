import { Router } from "express";
import {
  createFamilyMember,
  deleteFamilyMember,
  getFamily,
  getFamilyMember,
  getFamilyMemberByUser,
  updateFamilyMember,
} from "../controllers/FamilyController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/family", getFamily);
router.get("/families/user", verifyToken, getFamilyMemberByUser);
router.get("/families", getFamilyMember);
router.post("/families/user", verifyToken, createFamilyMember);
router.put("/families/:id", updateFamilyMember);
router.delete("/families/:id", deleteFamilyMember);

export default router;
