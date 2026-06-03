import QuizScore from "../models/QuizScore.js";
import Quiz from "../models/Quiz.js";

export async function saveQuizScore(req, res) {
  try {
    const { quizId, userEmail, answers } = req.body;

    if (!quizId || !userEmail || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "quizId, userEmail, and answers are required",
      });
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      userEmail,
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz not found for this user",
      });
    }

    let score = 0;

    const cleanAnswers = quiz.questions.map((question) => {
      const submittedAnswer = answers.find((answer) => {
        return answer.questionId?.toString() === question._id.toString();
      });

      const selectedOptionIndex = submittedAnswer?.selectedOptionIndex;

      const isCorrect = selectedOptionIndex === question.correctOptionIndex;

      if (isCorrect) {
        score++;
      }

      return {
        questionId: question._id,
        selectedOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage =
      totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    const newQuizScore = new QuizScore({
      quizId,
      userEmail,
      score,
      totalQuestions,
      percentage,
      answers: cleanAnswers,
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
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const scores = await QuizScore.find({
      quizId: req.params.quizId,
      userEmail,
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

    if (!quizId || !userEmail) {
      return res.status(400).json({
        message: "quizId and userEmail are required",
      });
    }

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

    if (!quizId || !userEmail) {
      return res.status(400).json({
        message: "quizId and userEmail are required",
      });
    }

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

    const latestScore = [...scores].sort((a, b) => {
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
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const deletedScore = await QuizScore.findOneAndDelete({
      _id: req.params.id,
      userEmail,
    });

    if (!deletedScore) {
      return res.status(404).json({ message: "Quiz score not found" });
    }

    res.status(200).json({ message: "Quiz score deleted successfully" });
  } catch (error) {
    console.error("Error in deleteQuizScore controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getQuizScoreById(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const quizScore = await QuizScore.findOne({
      _id: req.params.id,
      userEmail,
    });

    if (!quizScore) {
      return res.status(404).json({ message: "Quiz score not found" });
    }

    res.status(200).json(quizScore);
  } catch (error) {
    console.error("Error in getQuizScoreById controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
