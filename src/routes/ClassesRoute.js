import { Router } from "express";
import {
  createClasses,
  getClasses,
  deleteClasses,
  updateClasses,
} from "../controllers/ClassesController.js";

const router = Router();

router.get("/classes", getClasses);
router.post("/classes", createClasses);
router.put("/classes/:id", updateClasses);
router.delete("/classes/:id", deleteClasses);

export default router;
