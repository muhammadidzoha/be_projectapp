import { Router } from "express";
import {
  addCity,
  getProvinces,
  addProvinces,
} from "../controllers/ProvinceController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/province", getProvinces);
router.post("/provinces", verifyToken, addProvinces);
router.post("/provinces/:province/cities", verifyToken, addCity);

export default router;
