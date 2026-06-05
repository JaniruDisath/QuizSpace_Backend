import express from "express";

import {
  seedPublicCategories,
  seedPublicQuizzes,
  seedUsers,
  seedPrivateFolders,
  seedPrivateQuizzes,
  seedPrivateQuizScores,
  seedPublicAttempts,
  recalculateAllUserPublicStats,
  recalculateUserPublicStats,
  seedPostedQuizStats,
} from "../controllers/devSeedController.js";

const router = express.Router();

router.post("/categories", seedPublicCategories);

router.post("/users", seedUsers);

router.post("/public-quizzes", seedPublicQuizzes);

router.post("/private-folders", seedPrivateFolders);

router.post("/private-quizzes", seedPrivateQuizzes);

router.post("/private-quiz-scores", seedPrivateQuizScores);

router.post("/public-attempts", seedPublicAttempts);

router.post("/recalculate-user-public-stats", recalculateAllUserPublicStats);

router.post("/recalculate-user-public-stats", recalculateUserPublicStats);

router.post("/posted-quiz-stats", seedPostedQuizStats);



export default router;