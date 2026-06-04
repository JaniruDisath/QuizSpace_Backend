import mongoose from "mongoose";

import PublicQuiz from "../models/PublicQuiz.js";
import PublicQuizAttempt from "../models/PublicQuizAttempt.js";
import User from "../../../modules/users/models/User.js";

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
    const { publicQuizId, userEmail, selectedAnswers, durationSeconds } =
      req.body;

    if (!publicQuizId || !userEmail || !selectedAnswers) {
      return res.status(400).json({
        message: "publicQuizId, userEmail, and selectedAnswers are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(publicQuizId)) {
      return res.status(400).json({ message: "Invalid public quiz id" });
    }

    const publicQuiz = await PublicQuiz.findById(publicQuizId);

    if (!publicQuiz || publicQuiz.status !== "published") {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    const user = await User.findOne({ email: userEmail });

    let score = 0;
    const answers = [];

    for (const question of publicQuiz.questions) {
      const selectedOptionIndex = selectedAnswers[question._id.toString()];

      if (
        selectedOptionIndex === undefined ||
        selectedOptionIndex === null ||
        selectedOptionIndex < 0 ||
        selectedOptionIndex >= question.options.length
      ) {
        return res.status(400).json({
          message: "All questions must be answered before submitting.",
        });
      }

      const isCorrect = selectedOptionIndex === question.correctOptionIndex;
      const pointsEarned = isCorrect ? publicQuiz.pointsPerQuestion : 0;

      if (isCorrect) {
        score++;
      }

      answers.push({
        questionId: question._id,
        selectedOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        isCorrect,
        pointsEarned,
      });
    }

    const totalQuestions = publicQuiz.questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    const pointsEarned = score * publicQuiz.pointsPerQuestion;

    const safeDurationSeconds = Math.max(1, Number(durationSeconds) || 1);

    const newResult = {
      userName: user?.fullName || "QuizSpace User",
      score,
      totalQuestions,
      percentage,
      pointsEarned,
      durationSeconds: safeDurationSeconds,
      answers,
    };

    const existingAttempt = await PublicQuizAttempt.findOne({
      publicQuizId,
      userEmail,
    });

    let savedAttempt;
    let pointsDifference = 0;
    let wasBestUpdated = false;

    if (!existingAttempt) {
      savedAttempt = new PublicQuizAttempt({
        publicQuizId,
        userEmail,
        userName: newResult.userName,
        score: newResult.score,
        totalQuestions: newResult.totalQuestions,
        percentage: newResult.percentage,
        pointsEarned: newResult.pointsEarned,
        durationSeconds: newResult.durationSeconds,
        attemptCount: 1,
        answers: newResult.answers,
        bestAttemptAt: new Date(),
        lastAttemptAt: new Date(),
      });

      await savedAttempt.save();

      pointsDifference = newResult.pointsEarned;
      wasBestUpdated = true;
    } else {
      existingAttempt.attemptCount += 1;
      existingAttempt.lastAttemptAt = new Date();
      existingAttempt.userName = newResult.userName;

      if (isNewResultBetter(newResult, existingAttempt)) {
        pointsDifference =
          newResult.pointsEarned - existingAttempt.pointsEarned;

        existingAttempt.score = newResult.score;
        existingAttempt.totalQuestions = newResult.totalQuestions;
        existingAttempt.percentage = newResult.percentage;
        existingAttempt.pointsEarned = newResult.pointsEarned;
        existingAttempt.durationSeconds = newResult.durationSeconds;
        existingAttempt.answers = newResult.answers;
        existingAttempt.bestAttemptAt = new Date();

        wasBestUpdated = true;
      }

      savedAttempt = await existingAttempt.save();
    }

    await recalculatePublicQuizStats(publicQuizId);

    if (pointsDifference !== 0 || !existingAttempt) {
      await User.findOneAndUpdate(
        { email: userEmail },
        {
          $inc: {
            "publicStats.totalPoints": pointsDifference,
          },
        },
      );
    }

    await User.findOneAndUpdate(
      { email: userEmail },
      {
        $inc: {
          "publicStats.publicQuizzesAttempted": 1,
        },
      },
    );

    res.status(existingAttempt ? 200 : 201).json({
      message: wasBestUpdated
        ? "Public quiz attempt saved as best result"
        : "Attempt recorded, but previous best result was kept",
      attempt: savedAttempt,
      wasBestUpdated,
    });
  } catch (error) {
    console.error("Error in submitPublicQuizAttempt controller", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate attempt conflict. Please submit again.",
      });
    }

    res.status(500).json({ message: "Internal Server Error" });
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