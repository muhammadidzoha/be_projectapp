import { Router } from "express";
import {
  createClasses,
  getClasses,
  deleteClasses,
  updateClasses,
  getClassesBelongsToSchool,
} from "../controllers/ClassesController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/schools/:id/classes", getClasses);
router.get("/classes", verifyToken, getClassesBelongsToSchool);
router.post("/classes", verifyToken, createClasses);
router.put("/classes/:id", updateClasses);
router.delete("/classes/:id", deleteClasses);

export default router;
