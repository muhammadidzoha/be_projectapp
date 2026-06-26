import { Router } from "express";
import { getProvinces, createProvince} from "../controllers/ProvinceController.js";

const router = Router();

router.get("/province", getProvinces);
router.post("/province", createProvince);

export default router;
