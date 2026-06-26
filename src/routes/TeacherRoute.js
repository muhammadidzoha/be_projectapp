import { Router } from "express";
import {
  createTeacher,
  deleteTeacher,
  getTeachers,
  updateTeacher,
} from "../controllers/TeacherController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/teachers", getTeachers);
router.post("/teachers", verifyToken, createTeacher);
router.put("/teachers/:id", updateTeacher);
router.delete("/teachers/:id", deleteTeacher);

export default router;
