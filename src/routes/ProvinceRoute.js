import { Router } from "express";
import { getProvinces } from "../controllers/ProvinceController.js";

const router = Router();

router.get("/province", getProvinces);

export default router;
