import { Router } from "express";
import { getCities, getCitiesByProvince, createCity } from "../controllers/CityController.js";

const router = Router();

router.get("/city", getCities);
router.get("/province/:id/cities", getCitiesByProvince);
router.post("/province/:id/cities", createCity);

export default router;
