import { Router } from "express";
import {
  checkAnsweredQuesioner,
  checkAnsweredQuesionerInstitution,
  createResponseQuesioner,
  createResponseQuesionerInstitution,
  getResponseQuesioner,
  getResponseQuesionerInstitution,
  updateResponseQuesioner,
} from "../controllers/ResponseQuesionerController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/response/:id", verifyToken, getResponseQuesioner);
router.get(
  "/response/institution/:id",
  verifyToken,
  getResponseQuesionerInstitution
);
router.get("/response/checking/:id", verifyToken, checkAnsweredQuesioner);
router.get(
  "/response/checking/institution/:id",
  verifyToken,
  checkAnsweredQuesionerInstitution
);
router.post("/response/:id", verifyToken, createResponseQuesioner);
router.post(
  "/response/institution/:id",
  verifyToken,
  createResponseQuesionerInstitution
);
router.put("/response/:id", updateResponseQuesioner);

export default router;
