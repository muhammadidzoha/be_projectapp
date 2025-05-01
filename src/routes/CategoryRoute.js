import { Router } from "express";
import { getCategory } from "../controllers/CategoryController.js";

const router = Router();

router.get("/categories", getCategory);

export default router;
