import { Router } from "express";
import { getStudents } from "../controllers/StudentController.js";

const router = Router();

router.get("/students", getStudents);

export default router;
