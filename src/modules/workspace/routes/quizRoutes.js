import express from "express";

import {
  getAllQuizzes,
  getQuizzesByFolder,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
} from "../controllers/quizController.js";

const router = express.Router();

router.get("/", getAllQuizzes);

router.get("/by-folder", getQuizzesByFolder);

router.get("/:id", getQuizById);

router.post("/", createQuiz);

router.put("/:id", updateQuiz);

router.delete("/:id", deleteQuiz);

export default router;
