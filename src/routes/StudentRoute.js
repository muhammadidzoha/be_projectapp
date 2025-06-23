import { Router } from "express";
import {
  getStudentByUser,
  getStudents,
} from "../controllers/StudentController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/students", getStudents);
router.get("/students/user", verifyToken, getStudentByUser);

export default router;
