import mongoose from "mongoose";

import PublicQuiz from "../models/PublicQuiz.js";
import PublicQuizAttempt from "../models/PublicQuizAttempt.js";
import User from "../../../modules/users/models/User.js";

import PublicQuizAttemptEvent from "../models/PublicQuizAttemptEvent.js";

async function recalculatePublicQuizStats(publicQuizId) {
  const attempts = await PublicQuizAttempt.find({ publicQuizId });

  if (attempts.length === 0) {
    await PublicQuiz.findByIdAndUpdate(publicQuizId, {
      attemptCount: 0,
      participantCount: 0,
      averagePercentage: 0,
      averagePoints: 0,
    });

    return;
  }

  const totalAttemptCount = attempts.reduce(
    (sum, attempt) => sum + attempt.attemptCount,
    0,
  );

  const totalPercentage = attempts.reduce(
    (sum, attempt) => sum + attempt.percentage,
    0,
  );

  const totalPoints = attempts.reduce(
    (sum, attempt) => sum + attempt.pointsEarned,
    0,
  );

  await PublicQuiz.findByIdAndUpdate(publicQuizId, {
    attemptCount: totalAttemptCount,
    participantCount: attempts.length,
    averagePercentage: Math.round(totalPercentage / attempts.length),
    averagePoints: Math.round(totalPoints / attempts.length),
  });
}

function isNewResultBetter(newResult, existingAttempt) {
  if (newResult.score > existingAttempt.score) {
    return true;
  }

  if (
    newResult.score === existingAttempt.score &&
    newResult.durationSeconds < existingAttempt.durationSeconds
  ) {
    return true;
  }

  return false;
}

export async function submitPublicQuizAttempt(req, res) {
  try {
    const {
      publicQuizId,
      userEmail,
      selectedAnswers,
      durationSeconds,
      timeTakenSeconds,
    } = req.body;

    if (!publicQuizId || !userEmail || !selectedAnswers) {
      return res.status(400).json({
        message: "publicQuizId, userEmail, and selectedAnswers are required",
      });
    }

    const publicQuiz = await PublicQuiz.findById(publicQuizId);

    if (!publicQuiz || publicQuiz.status !== "published") {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    const totalQuestions = publicQuiz.questions.length;

    if (totalQuestions === 0) {
      return res.status(400).json({
        message: "This public quiz has no questions.",
      });
    }

    const user = await User.findOne({ email: userEmail });

    let score = 0;

    const answers = publicQuiz.questions.map((question) => {
      const selectedValue = selectedAnswers[question._id.toString()];
      const selectedOptionIndex = Number(selectedValue);

      if (!Number.isInteger(selectedOptionIndex)) {
        throw new Error(`Missing answer for question ${question._id}`);
      }

      const isCorrect = selectedOptionIndex === question.correctOptionIndex;
      const pointsEarned = isCorrect ? publicQuiz.pointsPerQuestion : 0;

      if (isCorrect) {
        score++;
      }

      return {
        questionId: question._id,
        selectedOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        isCorrect,
        pointsEarned,
      };
    });

    const percentage = Math.round((score / totalQuestions) * 100);
    const pointsEarned = score * publicQuiz.pointsPerQuestion;

    const safeDurationSeconds = Math.max(
      Number(durationSeconds || timeTakenSeconds || 1),
      1,
    );

    await PublicQuizAttemptEvent.create({
      publicQuizId,
      userEmail,
      userName: user?.fullName || "QuizSpace User",
      score,
      totalQuestions,
      percentage,
      pointsEarned,
      durationSeconds: safeDurationSeconds,
      answers,
      attemptedAt: new Date(),
    });

    const existingAttempt = await PublicQuizAttempt.findOne({
      publicQuizId,
      userEmail,
    });

    let savedAttempt;

    if (!existingAttempt) {
      savedAttempt = await PublicQuizAttempt.create({
        publicQuizId,
        userEmail,
        userName: user?.fullName || "QuizSpace User",
        score,
        totalQuestions,
        percentage,
        pointsEarned,
        durationSeconds: safeDurationSeconds,
        totalDurationSeconds: safeDurationSeconds,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        answers,
      });
    } else {
      const currentBestDuration = Number(
        existingAttempt.durationSeconds || existingAttempt.totalDurationSeconds || 999999,
      );

      const isBetterScore = score > existingAttempt.score;
      const isEqualScoreButFaster =
        score === existingAttempt.score && safeDurationSeconds < currentBestDuration;

      existingAttempt.attemptCount = (existingAttempt.attemptCount || 1) + 1;
      existingAttempt.totalDurationSeconds =
        (existingAttempt.totalDurationSeconds || 0) + safeDurationSeconds;
      existingAttempt.lastAttemptAt = new Date();

      if (isBetterScore || isEqualScoreButFaster) {
        existingAttempt.score = score;
        existingAttempt.totalQuestions = totalQuestions;
        existingAttempt.percentage = percentage;
        existingAttempt.pointsEarned = pointsEarned;
        existingAttempt.durationSeconds = safeDurationSeconds;
        existingAttempt.answers = answers;
      }

      savedAttempt = await existingAttempt.save();
    }

    const allQuizEvents = await PublicQuizAttemptEvent.find({ publicQuizId });

    const newAttemptCount = allQuizEvents.length;

    const participantCount = new Set(
      allQuizEvents.map((event) => event.userEmail),
    ).size;

    const averagePercentage = Math.round(
      allQuizEvents.reduce((sum, event) => sum + (event.percentage || 0), 0) /
        newAttemptCount,
    );

    const averagePoints = Math.round(
      allQuizEvents.reduce((sum, event) => sum + (event.pointsEarned || 0), 0) /
        newAttemptCount,
    );

    await PublicQuiz.findByIdAndUpdate(publicQuizId, {
      attemptCount: newAttemptCount,
      participantCount,
      averagePercentage,
      averagePoints,
    });

    await User.findOneAndUpdate(
      { email: userEmail },
      {
        $inc: {
          "publicStats.totalPoints": pointsEarned,
          "publicStats.publicQuizzesAttempted": 1,
          "publicStats.totalTimeSpentSeconds": safeDurationSeconds,
        },
      },
    );

    return res.status(201).json({
      message: "Public quiz attempt saved successfully",
      attempt: savedAttempt,
    });
  } catch (error) {
    console.error("Error in submitPublicQuizAttempt controller", error);

    if (error.message?.startsWith("Missing answer")) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getAllPublicAttempts(req, res) {
  try {
    const attempts = await PublicQuizAttempt.find().sort({
      score: -1,
      durationSeconds: 1,
      updatedAt: -1,
    });

    res.status(200).json(attempts);
  } catch (error) {
    console.error("Error in getAllPublicAttempts controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getPublicAttemptById(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid public attempt id" });
    }

    const attempt = await PublicQuizAttempt.findById(req.params.id);

    if (!attempt) {
      return res.status(404).json({ message: "Public attempt not found" });
    }

    res.status(200).json(attempt);
  } catch (error) {
    console.error("Error in getPublicAttemptById controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getPublicAttemptsByQuiz(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.publicQuizId)) {
      return res.status(400).json({ message: "Invalid public quiz id" });
    }

    const attempts = await PublicQuizAttempt.find({
      publicQuizId: req.params.publicQuizId,
    }).sort({
      score: -1,
      durationSeconds: 1,
      updatedAt: -1,
    });

    res.status(200).json(attempts);
  } catch (error) {
    console.error("Error in getPublicAttemptsByQuiz controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getPublicAttemptsByUser(req, res) {
  try {
    const { userEmail } = req.params;

    const attempts = await PublicQuizAttempt.find({
      userEmail,
    }).sort({ updatedAt: -1 });

    res.status(200).json(attempts);
  } catch (error) {
    console.error("Error in getPublicAttemptsByUser controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deletePublicAttempt(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid public attempt id" });
    }

    const attempt = await PublicQuizAttempt.findById(req.params.id);

    if (!attempt) {
      return res.status(404).json({ message: "Public attempt not found" });
    }

    if (attempt.userEmail !== userEmail) {
      return res.status(403).json({
        message: "You can only delete your own public quiz attempts.",
      });
    }

    await PublicQuizAttempt.findByIdAndDelete(req.params.id);

    await recalculatePublicQuizStats(attempt.publicQuizId);

    await User.findOneAndUpdate(
      { email: userEmail },
      {
        $inc: {
          "publicStats.totalPoints": -attempt.pointsEarned,
          "publicStats.publicQuizzesAttempted": -attempt.attemptCount,
        },
      },
    );

    res.status(200).json({
      message: "Public quiz attempt deleted successfully",
    });
  } catch (error) {
    console.error("Error in deletePublicAttempt controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
