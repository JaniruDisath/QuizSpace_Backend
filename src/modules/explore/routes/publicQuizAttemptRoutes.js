import express from "express";

import {
  submitPublicQuizAttempt,
  getAllPublicAttempts,
  getPublicAttemptById,
  getPublicAttemptsByQuiz,
  getPublicAttemptsByUser,
  deletePublicAttempt,
} from "../controllers/publicQuizAttemptController.js";

const router = express.Router();

router.post("/", submitPublicQuizAttempt);

router.get("/", getAllPublicAttempts);

router.get("/quiz/:publicQuizId", getPublicAttemptsByQuiz);

router.get("/user/:userEmail", getPublicAttemptsByUser);

router.get("/:id", getPublicAttemptById);

router.delete("/:id", deletePublicAttempt);

export default router;