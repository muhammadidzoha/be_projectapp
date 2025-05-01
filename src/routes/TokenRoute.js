import { Router } from "express";
import { refreshToken } from "../controllers/RefreshTokenController.js";

const router = Router();

router.get("/token", refreshToken);

export default router;
