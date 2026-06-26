import { Router } from "express";
import {
  getPartners,
  addPartners,
  deletePartner,
} from "../controllers/PartnerController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/partners", verifyToken, getPartners);
router.post("/partners", verifyToken, addPartners);
router.delete("/partners/:id", verifyToken, deletePartner);

export default router;
