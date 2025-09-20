import { Router } from "express";
import {
  createClasses,
  getClasses,
  deleteClasses,
  updateClasses,
} from "../controllers/ClassesController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/classes", verifyToken, getClasses);
router.post("/classes", verifyToken, createClasses);
router.put("/classes/:id", updateClasses);
router.delete("/classes/:id", deleteClasses);

export default router;
