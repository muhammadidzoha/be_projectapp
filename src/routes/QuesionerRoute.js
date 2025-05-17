import { Router } from "express";
import {
  getQuesioners,
  getQuestion,
  getQuestionByQuesionerId,
  updateQuestion,
} from "../controllers/QuesionerController.js";

const router = Router();

router.get("/quesioners", getQuesioners);
router.get("/questions", getQuestion);
router.get("/questions/:id", getQuestionByQuesionerId);
router.put("/questions/:id", updateQuestion);

export default router;
