import express from "express";

import {
  saveQuizScore,
  getQuizScoreById,
  getScoresByQuiz,
  getScoresByQuizAndUser,
  getQuizScoreSummary,
  deleteQuizScore,
} from "../controllers/quizScoreController.js";

const router = express.Router();

router.post("/", saveQuizScore);

router.get("/quiz/:quizId", getScoresByQuiz);

router.get("/quiz/:quizId/user/:userEmail", getScoresByQuizAndUser);

router.get("/summary/:quizId/user/:userEmail", getQuizScoreSummary);

router.get("/:id", getQuizScoreById);

router.delete("/:id", deleteQuizScore);

export default router;