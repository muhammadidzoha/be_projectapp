import { Router } from "express";
import {
  getAllQuestionByQuesionerId,
  getQuesioners,
  getQuestion,
  getQuestionByQuesionerId,
  updateQuestion,
} from "../controllers/QuesionerController.js";

const router = Router();

router.get("/quesioners", getQuesioners);
router.get("/questions", getQuestion);
router.get("/questions/:id", getQuestionByQuesionerId);
router.get("/question/:id", getAllQuestionByQuesionerId);
router.put("/questions/:id", updateQuestion);

export default router;
