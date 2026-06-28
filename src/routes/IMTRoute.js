import { Router } from "express";
import { calculateIMT } from "../controllers/IMTController.js";

const router = Router();

router.post("/imt/calculate", calculateIMT);

export default router;
