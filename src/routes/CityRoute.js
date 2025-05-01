import { Router } from "express";
import { getCities } from "../controllers/CityController.js";

const router = Router();

router.get("/city", getCities);

export default router;
