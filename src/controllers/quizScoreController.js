import QuizScore from "../models/QuizScore.js";

export async function saveQuizScore(req, res) {
  try {
    const { quizId, userEmail, score, totalQuestions, answers } = req.body;

    if (!quizId || !userEmail || score === undefined || !totalQuestions) {
      return res.status(400).json({
        message: "quizId, userEmail, score, and totalQuestions are required",
      });
    }

    const percentage = Math.round((score / totalQuestions) * 100);

    const newQuizScore = new QuizScore({
      quizId,
      userEmail,
      score,
      totalQuestions,
      percentage,
      answers: answers || [],
    });

    await newQuizScore.save();

    res.status(201).json({
      message: "Quiz score saved successfully",
      quizScore: newQuizScore,
    });
  } catch (error) {
    console.error("Error in saveQuizScore controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getScoresByQuiz(req, res) {
  try {
    const scores = await QuizScore.find({
      quizId: req.params.quizId,
    }).sort({ createdAt: -1 });

    res.status(200).json(scores);
  } catch (error) {
    console.error("Error in getScoresByQuiz controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getScoresByQuizAndUser(req, res) {
  try {
    const { quizId, userEmail } = req.params;

    const scores = await QuizScore.find({
      quizId,
      userEmail,
    }).sort({ createdAt: -1 });

    res.status(200).json(scores);
  } catch (error) {
    console.error("Error in getScoresByQuizAndUser controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getQuizScoreSummary(req, res) {
  try {
    const { quizId, userEmail } = req.params;

    const scores = await QuizScore.find({
      quizId,
      userEmail,
    });

    if (scores.length === 0) {
      return res.status(200).json({
        attempts: 0,
        averageScore: "-",
        bestScore: "-",
        latestScore: "-",
      });
    }

    const attempts = scores.length;

    const totalPercentage = scores.reduce((sum, item) => {
      return sum + item.percentage;
    }, 0);

    const averageScore = Math.round(totalPercentage / attempts);

    const bestScore = Math.max(...scores.map((item) => item.percentage));

    const latestScore = scores.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    })[0].percentage;

    res.status(200).json({
      attempts,
      averageScore: `${averageScore}%`,
      bestScore: `${bestScore}%`,
      latestScore: `${latestScore}%`,
    });
  } catch (error) {
    console.error("Error in getQuizScoreSummary controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteQuizScore(req, res) {
  try {
    const deletedScore = await QuizScore.findByIdAndDelete(req.params.id);

    if (!deletedScore) {
      return res.status(404).json({ message: "Quiz score not found" });
    }

    res.status(200).json({ message: "Quiz score deleted successfully" });
  } catch (error) {
    console.error("Error in deleteQuizScore controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}