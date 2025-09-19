import { Router } from "express";
import {
  addCity,
  getProvinces,
  addProvinces,
  getCitiesByProvince,
} from "../controllers/ProvinceController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/province", getProvinces);
router.get("/provinces/:province/cities", getCitiesByProvince);
router.post("/provinces", verifyToken, addProvinces);
router.post("/provinces/:province/cities", verifyToken, addCity);

export default router;
