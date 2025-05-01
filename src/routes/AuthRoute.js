import { Router } from "express";
import {
  login,
  logout,
  registerInstitution,
  registerParent,
} from "../controllers/AuthController.js";
import { validate } from "../middelware/validate.js";
import {
  registerInstitutionValidator,
  registerParentValidator,
} from "../validators/AuthValidator.js";

const router = Router();

router.post(
  "/register/parent",
  validate(registerParentValidator),
  registerParent
);
router.post(
  "/register/institution",
  validate(registerInstitutionValidator),
  registerInstitution
);
router.post("/login", login);
router.delete("/logout", logout);

export default router;
