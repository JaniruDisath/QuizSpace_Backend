import express from "express";

import {
  getCreatorDashboard,
  getCreatorPostedQuizzes,
  getCreatorQuizAnalytics,
  updateCreatorQuizStatus,
  createCreatorPublicQuiz,
  getCreatorPrivateQuizzes,
  publishExistingPrivateQuizForCreator,
  updateCreatorPublicQuizDetails,
  deleteCreatorPublicQuiz,
  getCreatorPublicQuizForEditor,
  updateCreatorPublicQuizEditor,
} from "../controllers/publicCreatorController.js";

const router = express.Router();

router.get("/:userEmail/dashboard", getCreatorDashboard);

router.get("/:userEmail/quizzes", getCreatorPostedQuizzes);

router.get(
  "/:userEmail/quizzes/:publicQuizId/analytics",
  getCreatorQuizAnalytics,
);

router.patch(
  "/:userEmail/quizzes/:publicQuizId/status",
  updateCreatorQuizStatus,
);

router.post("/:userEmail/create-public-quiz", createCreatorPublicQuiz);

router.get("/:userEmail/private-quizzes", getCreatorPrivateQuizzes);

router.post(
  "/:userEmail/publish-existing-quiz",
  publishExistingPrivateQuizForCreator,
);

router.patch(
  "/:userEmail/quizzes/:publicQuizId/details",
  updateCreatorPublicQuizDetails,
);

router.delete("/:userEmail/quizzes/:publicQuizId", deleteCreatorPublicQuiz);

router.get(
  "/:userEmail/public-quiz-editor/:publicQuizId",
  getCreatorPublicQuizForEditor,
);

router.put(
  "/:userEmail/public-quiz-editor/:publicQuizId",
  updateCreatorPublicQuizEditor,
);

export default router;
