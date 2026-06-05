import mongoose from "mongoose";

import PublicQuiz from "../models/PublicQuiz.js";
import PublicQuizAttempt from "../models/PublicQuizAttempt.js";
import PublicQuizAttemptEvent from "../models/PublicQuizAttemptEvent.js";

import User from "../../users/models/User.js";

import Quiz from "../../workspace/models/Quiz.js";

async function syncUserPostedQuizStats(userEmail) {
  const postedQuizzes = await PublicQuiz.find({
    authorEmail: userEmail,
  });

  const postedQuizIds = postedQuizzes.map((quiz) => quiz._id);

  const postedAttempts = await PublicQuizAttempt.find({
    publicQuizId: { $in: postedQuizIds },
  });

  const publicQuestionsPublished = postedQuizzes.reduce((sum, quiz) => {
    return sum + (quiz.questions?.length || 0);
  }, 0);

  const publicQuizAttemptsReceived = postedAttempts.reduce((sum, attempt) => {
    return sum + (attempt.attemptCount || 1);
  }, 0);

  const publicQuizParticipantsReached = new Set(
    postedAttempts.map((attempt) => attempt.userEmail),
  ).size;

  await User.findOneAndUpdate(
    { email: userEmail },
    {
      $set: {
        "publicStats.publicQuizzesPublished": postedQuizzes.length,
        "publicStats.publicQuestionsPublished": publicQuestionsPublished,
        "publicStats.publicQuizAttemptsReceived": publicQuizAttemptsReceived,
        "publicStats.publicQuizParticipantsReached":
          publicQuizParticipantsReached,
      },
    },
    { new: true },
  );
}

function normalizeStatusForFrontend(status) {
  return status === "hidden" ? "hidden" : "active";
}

function normalizeStatusForDatabase(status) {
  if (status === "active" || status === "published") {
    return "published";
  }

  if (status === "hidden") {
    return "hidden";
  }

  return null;
}

function getDateKey(dateValue) {
  const date = new Date(dateValue);
  return date.toISOString().slice(0, 10);
}

function getLastNDays(days = 10) {
  const dates = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    dates.push({
      key: getDateKey(date),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      attempts: 0,
    });
  }

  return dates;
}

function average(numbers) {
  if (!numbers.length) {
    return 0;
  }

  return Math.round(
    numbers.reduce((sum, number) => sum + number, 0) / numbers.length,
  );
}

function getMaxDate(items, getter) {
  let latest = null;

  for (const item of items) {
    const value = getter(item);

    if (!value) {
      continue;
    }

    const date = new Date(value);

    if (!latest || date > latest) {
      latest = date;
    }
  }

  return latest;
}

function buildQuestionStats(quiz, analyticsRecords) {
  const questionMap = new Map();

  quiz.questions.forEach((question, index) => {
    questionMap.set(question._id.toString(), {
      questionId: question._id,
      questionNumber: index + 1,
      questionText: question.questionText,
      attempts: 0,
      correctCount: 0,
      wrongCount: 0,
      correctRate: 0,
    });
  });

  for (const record of analyticsRecords) {
    for (const answer of record.answers || []) {
      const questionId = answer.questionId?.toString();

      if (!questionMap.has(questionId)) {
        continue;
      }

      const stat = questionMap.get(questionId);

      stat.attempts += 1;

      if (answer.isCorrect) {
        stat.correctCount += 1;
      } else {
        stat.wrongCount += 1;
      }
    }
  }

  const stats = Array.from(questionMap.values()).map((stat) => ({
    ...stat,
    correctRate:
      stat.attempts > 0
        ? Math.round((stat.correctCount / stat.attempts) * 100)
        : 0,
  }));

  return stats;
}

function getQuestionInsights(questionStats) {
  const attemptedQuestions = questionStats.filter(
    (question) => question.attempts > 0,
  );

  if (!attemptedQuestions.length) {
    return {
      mostMissedQuestion: "-",
      bestAnsweredQuestion: "-",
      lowestCorrectRate: 0,
      highestCorrectRate: 0,
    };
  }

  const mostMissed = [...attemptedQuestions].sort(
    (a, b) => a.correctRate - b.correctRate,
  )[0];

  const bestAnswered = [...attemptedQuestions].sort(
    (a, b) => b.correctRate - a.correctRate,
  )[0];

  return {
    mostMissedQuestion: `Q${mostMissed.questionNumber}`,
    bestAnsweredQuestion: `Q${bestAnswered.questionNumber}`,
    lowestCorrectRate: mostMissed.correctRate,
    highestCorrectRate: bestAnswered.correctRate,
  };
}

function getPerformanceStatus({ averageScore, correctRate, completionRate }) {
  if (averageScore >= 85 && correctRate >= 80 && completionRate >= 80) {
    return "Excellent";
  }

  if (averageScore >= 70 && correctRate >= 65) {
    return "Performing Well";
  }

  if (averageScore < 50 || correctRate < 50) {
    return "Needs Review";
  }

  return "Balanced";
}

function buildQuizAnalytics(quiz, summaryAttempts, eventRecords) {
  const quizId = quiz._id.toString();

  const quizSummaryAttempts = summaryAttempts.filter(
    (attempt) => attempt.publicQuizId.toString() === quizId,
  );

  const quizEvents = eventRecords.filter(
    (event) => event.publicQuizId.toString() === quizId,
  );

  const analyticsSource =
    quizEvents.length > 0 ? quizEvents : quizSummaryAttempts;

  const totalAttempts = quizSummaryAttempts.reduce(
    (sum, attempt) => sum + (attempt.attemptCount || 1),
    0,
  );

  const participants = new Set(
    quizSummaryAttempts.map((attempt) => attempt.userEmail),
  ).size;

  const averageScore = average(
    analyticsSource.map((record) => record.percentage || 0),
  );

  let correctAnswers = 0;
  let totalAnswers = 0;

  for (const record of analyticsSource) {
    for (const answer of record.answers || []) {
      totalAnswers += 1;

      if (answer.isCorrect) {
        correctAnswers += 1;
      }
    }
  }

  const correctRate =
    totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  const highestScore =
    analyticsSource.length > 0
      ? Math.max(...analyticsSource.map((record) => record.percentage || 0))
      : 0;

  const usersWithRetakes = quizSummaryAttempts.filter(
    (attempt) => (attempt.attemptCount || 1) > 1,
  ).length;

  const retakeRate =
    participants > 0 ? Math.round((usersWithRetakes / participants) * 100) : 0;

  // Since we only save completed attempts right now, completion is treated as 100.
  // Later, if we add "quiz started" tracking, this can become real.
  const completionRate = totalAttempts > 0 ? 100 : 0;

  const lastAttemptedAt = getMaxDate(
    analyticsSource,
    (record) => record.attemptedAt || record.lastAttemptAt || record.updatedAt,
  );

  const questionStats = buildQuestionStats(quiz, analyticsSource);
  const questionInsights = getQuestionInsights(questionStats);

  return {
    publicQuizId: quiz._id,
    title: quiz.title,
    description: quiz.description || "",
    categoryName: quiz.categoryName,
    difficulty: quiz.difficulty,
    status: normalizeStatusForFrontend(quiz.status),
    dbStatus: quiz.status,
    questionCount: quiz.questions.length,
    pointsPerQuestion: quiz.pointsPerQuestion || 10,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,

    attempts: totalAttempts,
    participants,
    averageScore,
    correctRate,
    highestScore,
    completionRate,
    retakeRate,
    lastAttemptedAt,

    mostMissedQuestion: questionInsights.mostMissedQuestion,
    bestAnsweredQuestion: questionInsights.bestAnsweredQuestion,
    lowestCorrectRate: questionInsights.lowestCorrectRate,
    highestCorrectRate: questionInsights.highestCorrectRate,

    performanceStatus: getPerformanceStatus({
      averageScore,
      correctRate,
      completionRate,
    }),

    questionStats,
  };
}

function sortPostedQuizzes(quizzes, sortBy) {
  const sorted = [...quizzes];

  switch (sortBy) {
    case "Highest Correct Rate":
      return sorted.sort((a, b) => b.correctRate - a.correctRate);

    case "Lowest Correct Rate":
      return sorted.sort((a, b) => a.correctRate - b.correctRate);

    case "Recently Published":
      return sorted.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

    case "Recently Updated":
      return sorted.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      );

    case "Most Participants":
      return sorted.sort((a, b) => b.participants - a.participants);

    case "Most Attempted":
    default:
      return sorted.sort((a, b) => b.attempts - a.attempts);
  }
}

async function getCreatorBaseData(userEmail, days = 10) {
  const quizzes = await PublicQuiz.find({ authorEmail: userEmail }).sort({
    updatedAt: -1,
  });

  const quizIds = quizzes.map((quiz) => quiz._id);

  const summaryAttempts = await PublicQuizAttempt.find({
    publicQuizId: { $in: quizIds },
  });

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const eventRecords = await PublicQuizAttemptEvent.find({
    publicQuizId: { $in: quizIds },
  });

  const recentEventRecords = eventRecords.filter(
    (event) => new Date(event.attemptedAt) >= startDate,
  );

  return {
    quizzes,
    quizIds,
    summaryAttempts,
    eventRecords,
    recentEventRecords,
    startDate,
  };
}

export async function getCreatorDashboard(req, res) {
  try {
    const { userEmail } = req.params;
    const days = Number(req.query.days) || 10;

    const {
      quizzes,
      summaryAttempts,
      eventRecords,
      recentEventRecords,
      startDate,
    } = await getCreatorBaseData(userEmail, days);

    const quizAnalytics = quizzes.map((quiz) =>
      buildQuizAnalytics(quiz, summaryAttempts, eventRecords),
    );

    const totalPublishedQuizzes = quizzes.filter(
      (quiz) => quiz.status === "published",
    ).length;

    const totalAttempts = summaryAttempts.reduce(
      (sum, attempt) => sum + (attempt.attemptCount || 1),
      0,
    );

    const uniqueParticipants = new Set(
      summaryAttempts.map((attempt) => attempt.userEmail),
    ).size;

    const analyticsSource =
      eventRecords.length > 0 ? eventRecords : summaryAttempts;

    const averageScore = average(
      analyticsSource.map((record) => record.percentage || 0),
    );

    let correctAnswers = 0;
    let totalAnswers = 0;

    for (const record of analyticsSource) {
      for (const answer of record.answers || []) {
        totalAnswers += 1;

        if (answer.isCorrect) {
          correctAnswers += 1;
        }
      }
    }

    const correctAnswerRate =
      totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    const todayKey = getDateKey(new Date());

    let attemptsToday = 0;

    if (eventRecords.length > 0) {
      attemptsToday = eventRecords.filter(
        (event) => getDateKey(event.attemptedAt) === todayKey,
      ).length;
    } else {
      attemptsToday = summaryAttempts.reduce((sum, attempt) => {
        const attemptDate = attempt.lastAttemptAt || attempt.updatedAt;

        if (getDateKey(attemptDate) === todayKey) {
          return sum + (attempt.attemptCount || 1);
        }

        return sum;
      }, 0);
    }

    const trend = getLastNDays(days);

    if (recentEventRecords.length > 0) {
      for (const event of recentEventRecords) {
        const key = getDateKey(event.attemptedAt);
        const day = trend.find((item) => item.key === key);

        if (day) {
          day.attempts += 1;
        }
      }
    } else {
      for (const attempt of summaryAttempts) {
        const dateValue = attempt.lastAttemptAt || attempt.updatedAt;

        if (new Date(dateValue) < startDate) {
          continue;
        }

        const key = getDateKey(dateValue);
        const day = trend.find((item) => item.key === key);

        if (day) {
          day.attempts += attempt.attemptCount || 1;
        }
      }
    }

    const mostAttemptedQuiz =
      quizAnalytics.length > 0
        ? [...quizAnalytics].sort((a, b) => b.attempts - a.attempts)[0]
        : null;

    const bestPerformingQuiz =
      quizAnalytics.length > 0
        ? [...quizAnalytics].sort((a, b) => b.averageScore - a.averageScore)[0]
        : null;

    const needsImprovementQuiz =
      quizAnalytics.length > 0
        ? [...quizAnalytics].sort((a, b) => a.correctRate - b.correctRate)[0]
        : null;

    res.status(200).json({
      summary: {
        totalPublishedQuizzes,
        totalQuizzes: quizzes.length,
        attemptsToday,
        totalAttempts,
        uniqueParticipants,
        averageScore,
        correctAnswerRate,
      },

      trend,

      insights: {
        mostAttemptedQuiz,
        bestPerformingQuiz,
        needsImprovementQuiz,
      },

      creatorHealth: {
        engagementScore: Math.min(100, Math.round(totalAttempts / 10)),
        difficultyBalance: correctAnswerRate,
        completionQuality: totalAttempts > 0 ? 100 : 0,
      },
    });
  } catch (error) {
    console.error("Error in getCreatorDashboard controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getCreatorPostedQuizzes(req, res) {
  try {
    const { userEmail } = req.params;

    const {
      search = "",
      categoryName = "All",
      difficulty = "All",
      status = "All",
      sortBy = "Most Attempted",
    } = req.query;

    const { quizzes, summaryAttempts, eventRecords } = await getCreatorBaseData(
      userEmail,
      10,
    );

    let quizAnalytics = quizzes.map((quiz) =>
      buildQuizAnalytics(quiz, summaryAttempts, eventRecords),
    );

    if (search.trim()) {
      const normalizedSearch = search.trim().toLowerCase();

      quizAnalytics = quizAnalytics.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(normalizedSearch) ||
          quiz.description.toLowerCase().includes(normalizedSearch),
      );
    }

    if (categoryName !== "All") {
      quizAnalytics = quizAnalytics.filter(
        (quiz) => quiz.categoryName === categoryName,
      );
    }

    if (difficulty !== "All") {
      quizAnalytics = quizAnalytics.filter(
        (quiz) => quiz.difficulty === difficulty,
      );
    }

    if (status !== "All") {
      quizAnalytics = quizAnalytics.filter(
        (quiz) => quiz.status === status.toLowerCase(),
      );
    }

    quizAnalytics = sortPostedQuizzes(quizAnalytics, sortBy);

    res.status(200).json(quizAnalytics);
  } catch (error) {
    console.error("Error in getCreatorPostedQuizzes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getCreatorQuizAnalytics(req, res) {
  try {
    const { userEmail, publicQuizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(publicQuizId)) {
      return res.status(400).json({ message: "Invalid public quiz id" });
    }

    const quiz = await PublicQuiz.findOne({
      _id: publicQuizId,
      authorEmail: userEmail,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    const summaryAttempts = await PublicQuizAttempt.find({
      publicQuizId: quiz._id,
    });

    const eventRecords = await PublicQuizAttemptEvent.find({
      publicQuizId: quiz._id,
    }).sort({ attemptedAt: -1 });

    const analytics = buildQuizAnalytics(quiz, summaryAttempts, eventRecords);

    res.status(200).json(analytics);
  } catch (error) {
    console.error("Error in getCreatorQuizAnalytics controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateCreatorQuizStatus(req, res) {
  try {
    const { userEmail, publicQuizId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(publicQuizId)) {
      return res.status(400).json({ message: "Invalid public quiz id" });
    }

    const dbStatus = normalizeStatusForDatabase(status);

    if (!dbStatus) {
      return res.status(400).json({
        message: "Status must be active, published, or hidden",
      });
    }

    const quiz = await PublicQuiz.findOne({
      _id: publicQuizId,
      authorEmail: userEmail,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    if (dbStatus === "published" && quiz.questions.length < 10) {
      return res.status(400).json({
        message:
          "A public quiz needs at least 10 questions before it can go active.",
      });
    }

    quiz.status = dbStatus;

    if (dbStatus === "published") {
      quiz.publishedAt = new Date();
    }

    if (dbStatus === "hidden") {
      quiz.publishedAt = null;
    }

    await quiz.save();

    res.status(200).json({
      message: "Public quiz status updated successfully",
      publicQuizId: quiz._id,
      status: normalizeStatusForFrontend(quiz.status),
      dbStatus: quiz.status,
      publishedAt: quiz.publishedAt,
    });
  } catch (error) {
    console.error("Error in updateCreatorQuizStatus controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

function isValidPublicDifficulty(difficulty) {
  return ["Beginner", "Intermediate", "Advanced"].includes(difficulty);
}

function cleanPublicQuestionsFromPrivateQuiz(privateQuestions = []) {
  return privateQuestions.map((question) => ({
    questionText: question.questionText || "Untitled question",

    options:
      Array.isArray(question.options) && question.options.length >= 2
        ? question.options.map((option, index) => ({
            text: option.text || `Option ${index + 1}`,
          }))
        : [{ text: "Option 1" }, { text: "Option 2" }],

    correctOptionIndex:
      question.correctOptionIndex !== undefined
        ? question.correctOptionIndex
        : 0,

    focusArea: question.focusArea || "",
    explanation: question.explanation || "No explanation added yet.",
  }));
}

export async function createCreatorPublicQuiz(req, res) {
  try {
    const { userEmail } = req.params;

    const {
      title,
      description,
      categoryName,
      difficulty,
      authorName,
      pointsPerQuestion,
    } = req.body;

    if (!title || !categoryName || !difficulty) {
      return res.status(400).json({
        message: "title, categoryName, and difficulty are required",
      });
    }

    if (!isValidPublicDifficulty(difficulty)) {
      return res.status(400).json({
        message: "difficulty must be Beginner, Intermediate, or Advanced",
      });
    }

    const existingQuiz = await PublicQuiz.findOne({
      title,
      authorEmail: userEmail,
    });

    if (existingQuiz) {
      return res.status(400).json({
        message: "You already have a public quiz with this title",
      });
    }

    const publicQuiz = await PublicQuiz.create({
      title,
      description: description || "",
      categoryName,
      difficulty,
      authorEmail: userEmail,
      authorName: authorName || "QuizSpace User",
      questions: [],
      pointsPerQuestion: pointsPerQuestion || 10,
      status: "hidden",
      publishedAt: null,
      attemptCount: 0,
      participantCount: 0,
      averagePercentage: 0,
      averagePoints: 0,
    });

    await syncUserPostedQuizStats(userEmail);

    return res.status(201).json({
      message: "Public quiz created successfully",
      quiz: publicQuiz,
    });
  } catch (error) {
    console.error("Error in createCreatorPublicQuiz controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getCreatorPrivateQuizzes(req, res) {
  try {
    const { userEmail } = req.params;

    const privateQuizzes = await Quiz.find({ userEmail }).sort({
      updatedAt: -1,
    });

    const data = privateQuizzes.map((quiz) => ({
      quizId: quiz._id,
      title: quiz.title,
      description: quiz.description || "",
      questionCount: quiz.questions?.length || 0,
      folderId: quiz.folderId,
      quizColor: quiz.quizColor || "primary",
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      isPublishReady: (quiz.questions?.length || 0) >= 10,
    }));

    res.status(200).json(data);
  } catch (error) {
    console.error("Error in getCreatorPrivateQuizzes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function publishExistingPrivateQuizForCreator(req, res) {
  try {
    const { userEmail } = req.params;

    const {
      privateQuizId,
      categoryName,
      difficulty,
      authorName,
      pointsPerQuestion,
    } = req.body;

    if (!privateQuizId || !categoryName || !difficulty) {
      return res.status(400).json({
        message: "privateQuizId, categoryName, and difficulty are required",
      });
    }

    if (!isValidPublicDifficulty(difficulty)) {
      return res.status(400).json({
        message: "difficulty must be Beginner, Intermediate, or Advanced",
      });
    }

    const privateQuiz = await Quiz.findOne({
      _id: privateQuizId,
      userEmail,
    });

    if (!privateQuiz) {
      return res.status(404).json({
        message: "Private quiz not found",
      });
    }

    const existingPublicQuiz = await PublicQuiz.findOne({
      sourcePrivateQuizId: privateQuiz._id,
      authorEmail: userEmail,
    });

    if (existingPublicQuiz) {
      await syncUserPostedQuizStats(userEmail);

      return res.status(200).json({
        message: "This private quiz is already published",
        quiz: existingPublicQuiz,
        alreadyPublished: true,
      });
    }

    const publicQuestions = cleanPublicQuestionsFromPrivateQuiz(
      privateQuiz.questions || [],
    );

    const status = publicQuestions.length >= 10 ? "published" : "hidden";
    const publishedAt = status === "published" ? new Date() : null;

    const publicQuiz = await PublicQuiz.create({
      title: privateQuiz.title,
      description: privateQuiz.description || "",
      categoryName,
      difficulty,
      authorEmail: userEmail,
      authorName: authorName || "QuizSpace User",
      sourcePrivateQuizId: privateQuiz._id,
      questions: publicQuestions,
      pointsPerQuestion: pointsPerQuestion || 10,
      status,
      publishedAt,
      attemptCount: 0,
      participantCount: 0,
      averagePercentage: 0,
      averagePoints: 0,
    });

    await syncUserPostedQuizStats(userEmail);

    return res.status(201).json({
      message:
        status === "published"
          ? "Private quiz published successfully"
          : "Private quiz copied as hidden because it has fewer than 10 questions",
      quiz: publicQuiz,
    });
  } catch (error) {
    console.error(
      "Error in publishExistingPrivateQuizForCreator controller",
      error,
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateCreatorPublicQuizDetails(req, res) {
  try {
    const { userEmail, publicQuizId } = req.params;

    const { title, description, categoryName, difficulty } = req.body;

    if (!mongoose.Types.ObjectId.isValid(publicQuizId)) {
      return res.status(400).json({ message: "Invalid public quiz id" });
    }

    if (!title || !categoryName || !difficulty) {
      return res.status(400).json({
        message: "title, categoryName, and difficulty are required",
      });
    }

    if (!isValidPublicDifficulty(difficulty)) {
      return res.status(400).json({
        message: "difficulty must be Beginner, Intermediate, or Advanced",
      });
    }

    const quiz = await PublicQuiz.findOneAndUpdate(
      {
        _id: publicQuizId,
        authorEmail: userEmail,
      },
      {
        title,
        description: description || "",
        categoryName,
        difficulty,
      },
      {
        new: true,
      },
    );

    if (!quiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    res.status(200).json({
      message: "Public quiz details updated successfully",
      quiz,
    });
  } catch (error) {
    console.error("Error in updateCreatorPublicQuizDetails controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteCreatorPublicQuiz(req, res) {
  try {
    const { userEmail, publicQuizId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(publicQuizId)) {
      return res.status(400).json({ message: "Invalid public quiz id" });
    }

    const quiz = await PublicQuiz.findOne({
      _id: publicQuizId,
      authorEmail: userEmail,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    await PublicQuizAttempt.deleteMany({ publicQuizId: quiz._id });
    await PublicQuizAttemptEvent.deleteMany({ publicQuizId: quiz._id });
    await PublicQuiz.findByIdAndDelete(quiz._id);

    await syncUserPostedQuizStats(userEmail);

    return res.status(200).json({
      message: "Public quiz deleted successfully",
      publicQuizId,
    });
  } catch (error) {
    console.error("Error in deleteCreatorPublicQuiz controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

function cleanPublicDraftQuestions(questions = []) {
  return questions.map((question) => {
    const cleanQuestion = {
      questionText: question.questionText || "",
      options: Array.isArray(question.options)
        ? question.options.map((option) => {
            const cleanOption = {
              text: option.text || "",
            };

            if (option._id) {
              cleanOption._id = option._id;
            }

            return cleanOption;
          })
        : [],
      correctOptionIndex: Number.isInteger(question.correctOptionIndex)
        ? question.correctOptionIndex
        : 0,
      focusArea: question.focusArea || "",
      explanation: question.explanation || "",
      isLocked: question.isLocked || false,
    };

    if (question._id) {
      cleanQuestion._id = question._id;
    }

    return cleanQuestion;
  });
}

function getPublicQuizReadiness(quiz) {
  const errors = [];

  if (!quiz.title || quiz.title.trim() === "") {
    errors.push("Quiz title is required.");
  }

  if (!quiz.categoryName || quiz.categoryName.trim() === "") {
    errors.push("Category is required.");
  }

  if (!["Beginner", "Intermediate", "Advanced"].includes(quiz.difficulty)) {
    errors.push("Difficulty must be Beginner, Intermediate, or Advanced.");
  }

  if (!Array.isArray(quiz.questions) || quiz.questions.length < 10) {
    errors.push("At least 10 questions are required to go active.");
  }

  quiz.questions.forEach((question, questionIndex) => {
    const questionNumber = questionIndex + 1;

    if (!question.questionText || question.questionText.trim() === "") {
      errors.push(`Question ${questionNumber} is missing question text.`);
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      errors.push(`Question ${questionNumber} must have at least 2 options.`);
    }

    question.options?.forEach((option, optionIndex) => {
      if (!option.text || option.text.trim() === "") {
        errors.push(
          `Question ${questionNumber}, option ${optionIndex + 1} is empty.`,
        );
      }
    });

    if (
      question.correctOptionIndex < 0 ||
      question.correctOptionIndex >= question.options.length
    ) {
      errors.push(`Question ${questionNumber} has an invalid correct answer.`);
    }

    if (!question.explanation || question.explanation.trim() === "") {
      errors.push(`Question ${questionNumber} is missing explanation.`);
    }
  });

  return {
    isReady: errors.length === 0,
    errors,
  };
}

export async function getCreatorPublicQuizForEditor(req, res) {
  try {
    const { userEmail, publicQuizId } = req.params;

    const quiz = await PublicQuiz.findOne({
      _id: publicQuizId,
      authorEmail: userEmail,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    const readiness = getPublicQuizReadiness(quiz);

    return res.status(200).json({
      quiz,
      readiness,
    });
  } catch (error) {
    console.error("Error in getCreatorPublicQuizForEditor controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateCreatorPublicQuizEditor(req, res) {
  try {
    const { userEmail, publicQuizId } = req.params;

    const {
      title,
      description,
      categoryName,
      difficulty,
      pointsPerQuestion,
      questions,
    } = req.body;

    const quiz = await PublicQuiz.findOne({
      _id: publicQuizId,
      authorEmail: userEmail,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    quiz.title = title || quiz.title;
    quiz.description =
      description !== undefined ? description : quiz.description;
    quiz.categoryName = categoryName || quiz.categoryName;
    quiz.difficulty = difficulty || quiz.difficulty;
    quiz.pointsPerQuestion = pointsPerQuestion || quiz.pointsPerQuestion;
    quiz.questions = cleanPublicDraftQuestions(questions || quiz.questions);

    const readiness = getPublicQuizReadiness(quiz);

    if (quiz.status === "published" && !readiness.isReady) {
      quiz.status = "hidden";
      quiz.publishedAt = null;
    }

    await quiz.save();

    await syncUserPostedQuizStats(userEmail);

    return res.status(200).json({
      message: "Public quiz editor saved successfully",
      quiz,
      readiness: getPublicQuizReadiness(quiz),
    });
  } catch (error) {
    console.error("Error in updateCreatorPublicQuizEditor controller", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal Server Error" });
  }
}
