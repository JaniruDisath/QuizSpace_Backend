import express from "express";

import {
  getPublicQuizzes,
  getMyPublicQuizzes,
  getPublicQuizById,
  createPublicQuiz,
  publishPrivateQuiz,
  updatePublicQuiz,
  updatePublicQuizStatus,
  deletePublicQuiz,
} from "../controllers/publicQuizController.js";

const router = express.Router();

router.get("/", getPublicQuizzes);

router.get("/my", getMyPublicQuizzes);

router.post("/", createPublicQuiz);

router.post("/publish", publishPrivateQuiz);

router.get("/:id", getPublicQuizById);

router.put("/:id", updatePublicQuiz);

router.patch("/:id/status", updatePublicQuizStatus);

router.delete("/:id", deletePublicQuiz);

export default router;