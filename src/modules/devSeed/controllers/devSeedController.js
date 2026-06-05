import PublicQuiz from "../../explore/models/PublicQuiz.js";
import PublicCategory from "../../explore/models/PublicCategory.js";
import User from "../../users/models/User.js";
import Quiz from "../../workspace/models/Quiz.js";
import Folder from "../../workspace/models/Folder.js";
import QuizScore from "../../workspace/models/QuizScore.js";
import PublicQuizAttempt from "../../explore/models/PublicQuizAttempt.js";


function createSlug(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createQuizSeedKey(quiz) {
  const category = createSlug(quiz.categoryName || "general");
  const title = createSlug(quiz.title || "untitled");

  return quiz.seedKey || `public-quiz-seed:${category}:${title}`;
}

function cleanQuestions(questions = []) {
  return questions.map((question) => ({
    questionText: question.questionText,
    options: question.options.map((option) => ({
      text: option.text,
    })),
    correctOptionIndex: question.correctOptionIndex,
    focusArea: question.focusArea || "",
    explanation: question.explanation,
  }));
}

function validatePublicQuizSeed(quiz, index) {
  if (!quiz.title || quiz.title.trim() === "") {
    return `Quiz ${index + 1}: title is required.`;
  }

  if (!quiz.authorEmail || quiz.authorEmail.trim() === "") {
    return `Quiz ${index + 1}: authorEmail is required.`;
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    return `Quiz ${index + 1}: at least one question is required.`;
  }

  for (let i = 0; i < quiz.questions.length; i++) {
    const question = quiz.questions[i];

    if (!question.questionText || question.questionText.trim() === "") {
      return `Quiz ${index + 1}, Question ${i + 1}: questionText is required.`;
    }

    if (!question.options || question.options.length < 2) {
      return `Quiz ${index + 1}, Question ${i + 1}: at least 2 options are required.`;
    }

    for (let j = 0; j < question.options.length; j++) {
      if (!question.options[j].text || question.options[j].text.trim() === "") {
        return `Quiz ${index + 1}, Question ${i + 1}, Option ${j + 1}: text is required.`;
      }
    }

    if (
      question.correctOptionIndex === undefined ||
      question.correctOptionIndex < 0 ||
      question.correctOptionIndex >= question.options.length
    ) {
      return `Quiz ${index + 1}, Question ${i + 1}: invalid correctOptionIndex.`;
    }

    if (!question.explanation || question.explanation.trim() === "") {
      return `Quiz ${index + 1}, Question ${i + 1}: explanation is required.`;
    }
  }

  return null;
}

export async function seedPublicCategories(req, res) {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const item of items) {
      try {
        if (!item.categoryName) {
          errors.push({
            categoryName: item.categoryName,
            message: "categoryName is required",
          });
          continue;
        }

        const existingCategory = await PublicCategory.findOne({
          categoryName: item.categoryName,
        });

        if (existingCategory) {
          skipped++;
          continue;
        }

        await PublicCategory.create({
          categoryName: item.categoryName,
          icon: item.icon || "bi-grid",
          color: item.color || "primary",
          isActive: item.isActive !== undefined ? item.isActive : true,
        });

        created++;
      } catch (error) {
        errors.push({
          categoryName: item.categoryName,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Category seed completed",
      created,
      skipped,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Error in seedPublicCategories controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function seedUsers(req, res) {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const item of items) {
      try {
        if (!item.email || !item.fullName || !item.password) {
          errors.push({
            email: item.email,
            message: "fullName, email, and password are required",
          });
          continue;
        }

        const existingUser = await User.findOne({ email: item.email });

        if (existingUser) {
          skipped++;
          continue;
        }

        await User.create({
          fullName: item.fullName,
          email: item.email,
          password: item.password,
          publicStats: {
            totalPoints: 0,
            publicQuizzesAttempted: 0,
            publicQuizzesPublished: 0,
            publicQuestionsPublished: 0,
          },
        });

        created++;
      } catch (error) {
        errors.push({
          email: item.email,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      message: "User seed completed",
      created,
      skipped,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Error in seedUsers controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function seedPublicQuizzes(req, res) {
  try {
    const { items, defaultAuthorEmail, defaultAuthorName } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    let created = 0;
    let skipped = 0;
    let createdQuestions = 0;
    const errors = [];

    for (let index = 0; index < items.length; index++) {
      try {
        const item = {
          ...items[index],
          authorEmail: items[index].authorEmail || defaultAuthorEmail,
          authorName: items[index].authorName || defaultAuthorName,
        };

        const validationError = validatePublicQuizSeed(item, index);

        if (validationError) {
          errors.push({
            title: item.title,
            message: validationError,
          });
          continue;
        }

        const seedKey = createQuizSeedKey(item);

        const existingQuiz = await PublicQuiz.findOne({
          $or: [
            { seedKey },
            {
              title: item.title,
              authorEmail: item.authorEmail,
            },
          ],
        });

        if (existingQuiz) {
          skipped++;
          continue;
        }

        const publicQuiz = await PublicQuiz.create({
          seedKey,
          title: item.title,
          description: item.description || "",
          categoryName: item.categoryName || "General Knowledge",
          difficulty: item.difficulty || "Beginner",
          authorEmail: item.authorEmail,
          authorName: item.authorName || "QuizSpace User",
          sourcePrivateQuizId: null,
          questions: cleanQuestions(item.questions),
          pointsPerQuestion: item.pointsPerQuestion || 10,
          status: item.status || "published",
          attemptCount: 0,
          participantCount: 0,
          averagePercentage: 0,
          averagePoints: 0,
        });

        await User.findOneAndUpdate(
          { email: item.authorEmail },
          {
            $inc: {
              "publicStats.publicQuizzesPublished": 1,
              "publicStats.publicQuestionsPublished":
                publicQuiz.questions.length,
            },
          },
        );

        created++;
        createdQuestions += publicQuiz.questions.length;
      } catch (error) {
        errors.push({
          title: items[index]?.title,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Public quiz seed completed",
      received: items.length,
      created,
      skipped,
      createdQuestions,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Error in seedPublicQuizzes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function seedPrivateFolders(req, res) {
  try {
    const { items, settings } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    let created = 0;
    let skipped = 0;
    const errors = [];

    const duplicatePolicy = settings?.duplicatePolicy || "skip";

    for (const item of items) {
      try {
        if (!item.folderName || !item.userEmail) {
          errors.push({
            seedKey: item.seedKey,
            folderName: item.folderName,
            message: "folderName and userEmail are required",
          });
          continue;
        }

        let parentFolderId = null;

        if (item.parentFolderSeedKey) {
          const parentFolder = await Folder.findOne({
            seedKey: item.parentFolderSeedKey,
          });

          if (!parentFolder) {
            errors.push({
              seedKey: item.seedKey,
              folderName: item.folderName,
              message: `Parent folder not found for parentFolderSeedKey: ${item.parentFolderSeedKey}`,
            });
            continue;
          }

          parentFolderId = parentFolder._id;
        }

        const seedKey =
          item.seedKey ||
          `private-folder:${item.userEmail}:${item.parentFolderSeedKey || "root"}:${item.folderName}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        const existingFolder = await Folder.findOne({
          $or: [
            { seedKey },
            {
              folderName: item.folderName,
              userEmail: item.userEmail,
              parentFolderId,
            },
          ],
        });

        if (existingFolder && duplicatePolicy === "skip") {
          skipped++;
          continue;
        }

        if (existingFolder && duplicatePolicy === "update") {
          existingFolder.folderName = item.folderName;
          existingFolder.folderColor =
            item.folderColor || existingFolder.folderColor;
          existingFolder.parentFolderId = parentFolderId;
          existingFolder.seedKey = seedKey;

          await existingFolder.save();

          skipped++;
          continue;
        }

        if (existingFolder && duplicatePolicy === "reset") {
          await Folder.findByIdAndDelete(existingFolder._id);
        }

        await Folder.create({
          seedKey,
          folderName: item.folderName,
          folderColor: item.folderColor || "primary",
          parentFolderId,
          userEmail: item.userEmail,
        });

        created++;
      } catch (error) {
        errors.push({
          seedKey: item.seedKey,
          folderName: item.folderName,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Private folders seed completed",
      received: items.length,
      created,
      skipped,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Error in seedPrivateFolders controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

function createSeedSlug(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildPrivateQuizSeedKey(item) {
  if (item.seedKey) {
    return item.seedKey;
  }

  return `private-quiz:${item.userEmail}:${item.folderSeedKey || "root"}:${item.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function cleanPrivateQuizQuestions(questions = []) {
  return questions.map((question) => ({
    questionText: question.questionText || "",
    options: Array.isArray(question.options)
      ? question.options.map((option) => ({
          text: option.text || "",
        }))
      : [{ text: "Option A" }, { text: "Option B" }],
    correctOptionIndex:
      question.correctOptionIndex !== undefined
        ? question.correctOptionIndex
        : 0,
    explanation: question.explanation || "",
    isLocked: question.isLocked || false,
  }));
}

function validatePrivateQuizSeed(item) {
  if (!item.title || item.title.trim() === "") {
    return "title is required";
  }

  if (!item.userEmail || item.userEmail.trim() === "") {
    return "userEmail is required";
  }

  if (!Array.isArray(item.questions) || item.questions.length === 0) {
    return "questions must be a non-empty array";
  }

  for (let i = 0; i < item.questions.length; i++) {
    const question = item.questions[i];

    if (!Array.isArray(question.options) || question.options.length < 2) {
      return `Question ${i + 1} must have at least 2 options`;
    }

    if (
      question.correctOptionIndex === undefined ||
      question.correctOptionIndex < 0 ||
      question.correctOptionIndex >= question.options.length
    ) {
      return `Question ${i + 1} has invalid correctOptionIndex`;
    }
  }

  return null;
}

export async function seedPrivateQuizzes(req, res) {
  try {
    const { items, settings } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    const duplicatePolicy = settings?.duplicatePolicy || "skip";

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const item of items) {
      try {
        const validationError = validatePrivateQuizSeed(item);

        if (validationError) {
          errors.push({
            seedKey: item.seedKey,
            title: item.title,
            message: validationError,
          });
          continue;
        }

        let folderId = null;

        if (item.folderSeedKey) {
          const folder = await Folder.findOne({
            seedKey: item.folderSeedKey,
            userEmail: item.userEmail,
          });

          if (!folder) {
            errors.push({
              seedKey: item.seedKey,
              title: item.title,
              message: `Folder not found for folderSeedKey: ${item.folderSeedKey}`,
            });
            continue;
          }

          folderId = folder._id;
        }

        if (item.folderId) {
          folderId = item.folderId;
        }

        const seedKey = buildPrivateQuizSeedKey(item);

        const existingQuiz = await Quiz.findOne({
          $or: [
            { seedKey },
            {
              title: item.title,
              userEmail: item.userEmail,
              folderId,
            },
          ],
        });

        if (existingQuiz && duplicatePolicy === "skip") {
          skipped++;
          continue;
        }

        if (existingQuiz && duplicatePolicy === "update") {
          existingQuiz.seedKey = seedKey;
          existingQuiz.title = item.title;
          existingQuiz.description =
            item.description || existingQuiz.description;
          existingQuiz.quizColor = item.quizColor || existingQuiz.quizColor;
          existingQuiz.folderId = folderId;
          existingQuiz.userEmail = item.userEmail;
          existingQuiz.questions = cleanPrivateQuizQuestions(item.questions);

          await existingQuiz.save();

          skipped++;
          continue;
        }

        if (existingQuiz && duplicatePolicy === "reset") {
          await Quiz.findByIdAndDelete(existingQuiz._id);
        }

        await Quiz.create({
          seedKey,
          title: item.title,
          description: item.description || "",
          quizColor: item.quizColor || "success",
          folderId,
          userEmail: item.userEmail,
          questions: cleanPrivateQuizQuestions(item.questions),
        });

        created++;
      } catch (error) {
        errors.push({
          seedKey: item.seedKey,
          title: item.title,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Private quizzes seed completed",
      received: items.length,
      created,
      skipped,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Error in seedPrivateQuizzes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

function buildPrivateQuizScoreSeedKey(item) {
  if (item.seedKey) {
    return item.seedKey;
  }

  return `private-score:${item.userEmail}:${item.quizSeedKey || item.quizId}:${
    item.createdAt || Date.now()
  }`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getValidDate(value) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function buildQuizScoreAnswers(item, quiz) {
  if (!Array.isArray(item.answers) || item.answers.length === 0) {
    throw new Error("answers must be a non-empty array");
  }

  return item.answers.map((answer, index) => {
    const questionIndex =
      answer.questionIndex !== undefined ? answer.questionIndex : index;

    const question = answer.questionId
      ? quiz.questions.id(answer.questionId)
      : quiz.questions[questionIndex];

    if (!question) {
      throw new Error(
        `Question not found for answer index ${index}. questionIndex: ${questionIndex}`,
      );
    }

    const selectedOptionIndex = Number(answer.selectedOptionIndex);

    if (
      Number.isNaN(selectedOptionIndex) ||
      selectedOptionIndex < 0 ||
      selectedOptionIndex >= question.options.length
    ) {
      throw new Error(
        `Invalid selectedOptionIndex for question index ${questionIndex}`,
      );
    }

    const correctOptionIndex =
      answer.correctOptionIndex !== undefined
        ? Number(answer.correctOptionIndex)
        : question.correctOptionIndex;

    const isCorrect =
      answer.isCorrect !== undefined
        ? Boolean(answer.isCorrect)
        : selectedOptionIndex === correctOptionIndex;

    return {
      questionId: question._id,
      selectedOptionIndex,
      correctOptionIndex,
      isCorrect,
    };
  });
}

export async function seedPrivateQuizScores(req, res) {
  try {
    const { items, settings } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    const duplicatePolicy = settings?.duplicatePolicy || "skip";

    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const item of items) {
      try {
        if (!item.userEmail) {
          errors.push({
            seedKey: item.seedKey,
            message: "userEmail is required",
          });
          continue;
        }

        if (!item.quizSeedKey && !item.quizId) {
          errors.push({
            seedKey: item.seedKey,
            userEmail: item.userEmail,
            message: "quizSeedKey or quizId is required",
          });
          continue;
        }

        const quiz = item.quizId
          ? await Quiz.findById(item.quizId)
          : await Quiz.findOne({
              seedKey: item.quizSeedKey,
              userEmail: item.userEmail,
            });

        if (!quiz) {
          errors.push({
            seedKey: item.seedKey,
            userEmail: item.userEmail,
            quizSeedKey: item.quizSeedKey,
            message: `Quiz not found for quizSeedKey: ${item.quizSeedKey}`,
          });
          continue;
        }

        const seedKey = buildPrivateQuizScoreSeedKey(item);

        const existingScore = await QuizScore.findOne({ seedKey });

        if (existingScore && duplicatePolicy === "skip") {
          skipped++;
          continue;
        }

        if (existingScore && duplicatePolicy === "reset") {
          await QuizScore.findByIdAndDelete(existingScore._id);
        }

        const answers = buildQuizScoreAnswers(item, quiz);

        const calculatedScore = answers.filter(
          (answer) => answer.isCorrect,
        ).length;
        const totalQuestions = item.totalQuestions || quiz.questions.length;

        const score =
          item.score !== undefined ? Number(item.score) : calculatedScore;

        const percentage =
          item.percentage !== undefined
            ? Number(item.percentage)
            : Math.round((score / totalQuestions) * 100);

        const createdAt = getValidDate(item.createdAt);
        const updatedAt = getValidDate(item.updatedAt || item.createdAt);

        const scorePayload = {
          seedKey,
          quizId: quiz._id,
          userEmail: item.userEmail,
          score,
          totalQuestions,
          percentage,
          answers,
          createdAt,
          updatedAt,
        };

        if (existingScore && duplicatePolicy === "update") {
          existingScore.quizId = scorePayload.quizId;
          existingScore.userEmail = scorePayload.userEmail;
          existingScore.score = scorePayload.score;
          existingScore.totalQuestions = scorePayload.totalQuestions;
          existingScore.percentage = scorePayload.percentage;
          existingScore.answers = scorePayload.answers;
          existingScore.createdAt = scorePayload.createdAt;
          existingScore.updatedAt = scorePayload.updatedAt;

          await existingScore.save();

          skipped++;
          continue;
        }

        await QuizScore.create(scorePayload);

        created++;
      } catch (error) {
        errors.push({
          seedKey: item.seedKey,
          userEmail: item.userEmail,
          quizSeedKey: item.quizSeedKey,
          message: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Private quiz scores seed completed",
      received: items.length,
      created,
      skipped,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Error in seedPrivateQuizScores controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

function buildPublicAttemptSeedKey(item) {
  if (item.seedKey) {
    return item.seedKey;
  }

  return `public-attempt:${item.userEmail}:${
    item.publicQuizSeedKey || item.publicQuizId || item.publicQuizTitle
  }`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getSafeSeedDate(value) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function clampNumber(value, min, max) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return min;
  }

  return Math.max(min, Math.min(max, numberValue));
}

function buildPublicAttemptAnswers(item, publicQuiz) {
  const totalQuestions = publicQuiz.questions.length;

  const requestedScore =
    item.bestScore !== undefined
      ? Number(item.bestScore)
      : item.score !== undefined
        ? Number(item.score)
        : 0;

  const safeScore = clampNumber(requestedScore, 0, totalQuestions);

  return publicQuiz.questions.map((question, index) => {
    const correctOptionIndex = question.correctOptionIndex || 0;

    const selectedOptionIndex =
      index < safeScore
        ? correctOptionIndex
        : correctOptionIndex === 0
          ? 1
          : 0;

    const isCorrect = selectedOptionIndex === correctOptionIndex;

    return {
      questionId: question._id,
      selectedOptionIndex,
      correctOptionIndex,
      isCorrect,
      pointsEarned: isCorrect ? publicQuiz.pointsPerQuestion : 0,
    };
  });
}

async function recalculateSeededPublicQuizStats(publicQuizIds) {
  const uniqueQuizIds = [...new Set(publicQuizIds.map((id) => id.toString()))];

  for (const publicQuizId of uniqueQuizIds) {
    const attempts = await PublicQuizAttempt.find({ publicQuizId });

    if (attempts.length === 0) {
      await PublicQuiz.findByIdAndUpdate(publicQuizId, {
        attemptCount: 0,
        participantCount: 0,
        averagePercentage: 0,
        averagePoints: 0,
      });

      continue;
    }

    const totalAttemptCount = attempts.reduce(
      (sum, attempt) => sum + (attempt.attemptCount || 1),
      0,
    );

    const totalPercentage = attempts.reduce(
      (sum, attempt) => sum + (attempt.percentage || 0),
      0,
    );

    const totalPoints = attempts.reduce(
      (sum, attempt) => sum + (attempt.pointsEarned || 0),
      0,
    );

    await PublicQuiz.findByIdAndUpdate(publicQuizId, {
      attemptCount: totalAttemptCount,
      participantCount: attempts.length,
      averagePercentage: Math.round(totalPercentage / attempts.length),
      averagePoints: Math.round(totalPoints / attempts.length),
    });
  }
}

async function recalculateSeededUserPublicStats(userEmails) {
  const uniqueEmails = [...new Set(userEmails)];

  for (const userEmail of uniqueEmails) {
    const attempts = await PublicQuizAttempt.find({ userEmail });

    const totalPoints = attempts.reduce(
      (sum, attempt) => sum + (attempt.pointsEarned || 0),
      0,
    );

    const publicQuizzesAttempted = attempts.reduce(
      (sum, attempt) => sum + (attempt.attemptCount || 1),
      0,
    );

    await User.findOneAndUpdate(
      { email: userEmail },
      {
        $set: {
          "publicStats.totalPoints": totalPoints,
          "publicStats.publicQuizzesAttempted": publicQuizzesAttempted,
        },
      },
    );
  }
}

export async function seedPublicAttempts(req, res) {
  try {
    const { items, settings } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    const duplicatePolicy = settings?.duplicatePolicy || "skip";
    const shouldRecalculateStats = settings?.recalculateStats !== false;

    let created = 0;
    let skipped = 0;
    let updated = 0;
    const errors = [];

    const affectedQuizIds = [];
    const affectedUserEmails = [];

    for (const item of items) {
      try {
        if (!item.userEmail) {
          errors.push({
            seedKey: item.seedKey,
            message: "userEmail is required",
          });
          continue;
        }

        if (!item.publicQuizSeedKey && !item.publicQuizId && !item.publicQuizTitle) {
          errors.push({
            seedKey: item.seedKey,
            userEmail: item.userEmail,
            message:
              "publicQuizSeedKey, publicQuizId, or publicQuizTitle is required",
          });
          continue;
        }

        const publicQuiz = item.publicQuizId
          ? await PublicQuiz.findById(item.publicQuizId)
          : await PublicQuiz.findOne(
              item.publicQuizSeedKey
                ? { seedKey: item.publicQuizSeedKey }
                : { title: item.publicQuizTitle },
            );

        if (!publicQuiz) {
          errors.push({
            seedKey: item.seedKey,
            userEmail: item.userEmail,
            publicQuizSeedKey: item.publicQuizSeedKey,
            publicQuizTitle: item.publicQuizTitle,
            message: `Public quiz not found for publicQuizSeedKey: ${item.publicQuizSeedKey}`,
          });
          continue;
        }

        const user = await User.findOne({ email: item.userEmail });

        if (!user) {
          errors.push({
            seedKey: item.seedKey,
            userEmail: item.userEmail,
            message: "User not found",
          });
          continue;
        }

        const seedKey = buildPublicAttemptSeedKey(item);

        const existingAttempt = await PublicQuizAttempt.findOne({
          $or: [
            { seedKey },
            {
              publicQuizId: publicQuiz._id,
              userEmail: item.userEmail,
            },
          ],
        });

        if (existingAttempt && duplicatePolicy === "skip") {
          skipped++;
          continue;
        }

        if (existingAttempt && duplicatePolicy === "reset") {
          await PublicQuizAttempt.findByIdAndDelete(existingAttempt._id);
        }

        const answers = buildPublicAttemptAnswers(item, publicQuiz);

        const score =
          item.bestScore !== undefined
            ? clampNumber(item.bestScore, 0, publicQuiz.questions.length)
            : answers.filter((answer) => answer.isCorrect).length;

        const totalQuestions = publicQuiz.questions.length;

        const percentage =
          item.percentage !== undefined
            ? clampNumber(item.percentage, 0, 100)
            : Math.round((score / totalQuestions) * 100);

        const pointsEarned =
          item.pointsEarned !== undefined
            ? Math.max(0, Number(item.pointsEarned) || 0)
            : score * publicQuiz.pointsPerQuestion;

        const durationSeconds = Math.max(1, Number(item.durationSeconds) || 1);
        const attemptCount = Math.max(1, Number(item.attemptCount) || 1);

        const totalDurationSeconds =
          item.totalDurationSeconds !== undefined
            ? Math.max(0, Number(item.totalDurationSeconds) || 0)
            : durationSeconds * attemptCount;

        const bestAttemptAt = getSafeSeedDate(item.bestAttemptAt);
        const lastAttemptAt = getSafeSeedDate(item.lastAttemptAt);

        const attemptPayload = {
          seedKey,
          publicQuizId: publicQuiz._id,
          userEmail: item.userEmail,
          userName: item.userName || user.fullName || "QuizSpace User",
          score,
          totalQuestions,
          percentage,
          pointsEarned,
          durationSeconds,
          totalDurationSeconds,
          attemptCount,
          answers,
          bestAttemptAt,
          lastAttemptAt,
          createdAt: bestAttemptAt,
          updatedAt: lastAttemptAt,
        };

        if (existingAttempt && duplicatePolicy === "update") {
          existingAttempt.seedKey = attemptPayload.seedKey;
          existingAttempt.publicQuizId = attemptPayload.publicQuizId;
          existingAttempt.userEmail = attemptPayload.userEmail;
          existingAttempt.userName = attemptPayload.userName;
          existingAttempt.score = attemptPayload.score;
          existingAttempt.totalQuestions = attemptPayload.totalQuestions;
          existingAttempt.percentage = attemptPayload.percentage;
          existingAttempt.pointsEarned = attemptPayload.pointsEarned;
          existingAttempt.durationSeconds = attemptPayload.durationSeconds;
          existingAttempt.totalDurationSeconds = attemptPayload.totalDurationSeconds;
          existingAttempt.attemptCount = attemptPayload.attemptCount;
          existingAttempt.answers = attemptPayload.answers;
          existingAttempt.bestAttemptAt = attemptPayload.bestAttemptAt;
          existingAttempt.lastAttemptAt = attemptPayload.lastAttemptAt;
          existingAttempt.createdAt = attemptPayload.createdAt;
          existingAttempt.updatedAt = attemptPayload.updatedAt;

          await existingAttempt.save();

          updated++;
        } else {
          await PublicQuizAttempt.create(attemptPayload);
          created++;
        }

        affectedQuizIds.push(publicQuiz._id);
        affectedUserEmails.push(item.userEmail);
      } catch (error) {
        errors.push({
          seedKey: item.seedKey,
          userEmail: item.userEmail,
          publicQuizSeedKey: item.publicQuizSeedKey,
          message: error.message,
        });
      }
    }

    if (shouldRecalculateStats) {
      await recalculateSeededPublicQuizStats(affectedQuizIds);
      await recalculateSeededUserPublicStats(affectedUserEmails);
    }

    res.status(200).json({
      message: "Public attempts seed completed",
      received: items.length,
      created,
      updated,
      skipped,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Error in seedPublicAttempts controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function recalculateAllUserPublicStats(req, res) {
  try {
    const users = await User.find({});

    let updated = 0;

    for (const user of users) {
      const postedQuizzes = await PublicQuiz.find({
        authorEmail: user.email,
      });

      const postedQuizIds = postedQuizzes.map((quiz) => quiz._id);

      const postedAttempts = await PublicQuizAttempt.find({
        publicQuizId: { $in: postedQuizIds },
      });

      const attemptedByUser = await PublicQuizAttempt.find({
        userEmail: user.email,
      });

      const totalPoints = attemptedByUser.reduce(
        (sum, attempt) => sum + (attempt.pointsEarned || 0),
        0
      );

      const publicQuizzesAttempted = attemptedByUser.reduce(
        (sum, attempt) => sum + (attempt.attemptCount || 1),
        0
      );

      const publicQuestionsPublished = postedQuizzes.reduce(
        (sum, quiz) => sum + (quiz.questions?.length || 0),
        0
      );

      const publicQuizAttemptsReceived = postedAttempts.reduce(
        (sum, attempt) => sum + (attempt.attemptCount || 1),
        0
      );

      const publicQuizParticipantsReached = new Set(
        postedAttempts.map((attempt) => attempt.userEmail)
      ).size;

      await User.findByIdAndUpdate(user._id, {
        $set: {
          "publicStats.totalPoints": totalPoints,
          "publicStats.publicQuizzesAttempted": publicQuizzesAttempted,
          "publicStats.publicQuizzesPublished": postedQuizzes.length,
          "publicStats.publicQuestionsPublished": publicQuestionsPublished,
          "publicStats.publicQuizAttemptsReceived": publicQuizAttemptsReceived,
          "publicStats.publicQuizParticipantsReached":
            publicQuizParticipantsReached,
        },
      });

      updated++;
    }

    res.status(200).json({
      message: "User public stats recalculated successfully",
      updated,
    });
  } catch (error) {
    console.error("Error recalculating user public stats", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function recalculateUserPublicStats(req, res) {
  try {
    const users = await User.find({});

    let updated = 0;

    for (const user of users) {
      const postedQuizzes = await PublicQuiz.find({
        authorEmail: user.email,
      });

      const postedQuizIds = postedQuizzes.map((quiz) => quiz._id);

      const attemptsReceived = await PublicQuizAttempt.find({
        publicQuizId: { $in: postedQuizIds },
      });

      const attemptsMade = await PublicQuizAttempt.find({
        userEmail: user.email,
      });

      const publicQuestionsPublished = postedQuizzes.reduce((sum, quiz) => {
        return sum + (quiz.questions?.length || 0);
      }, 0);

      const publicQuizAttemptsReceived = attemptsReceived.reduce(
        (sum, attempt) => {
          return sum + (attempt.attemptCount || 1);
        },
        0,
      );

      const publicQuizParticipantsReached = new Set(
        attemptsReceived.map((attempt) => attempt.userEmail),
      ).size;

      const totalPoints = attemptsMade.reduce((sum, attempt) => {
        return sum + (attempt.pointsEarned || 0);
      }, 0);

      const publicQuizzesAttempted = attemptsMade.reduce((sum, attempt) => {
        return sum + (attempt.attemptCount || 1);
      }, 0);

      await User.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            "publicStats.totalPoints": totalPoints,
            "publicStats.publicQuizzesAttempted": publicQuizzesAttempted,
            "publicStats.publicQuizzesPublished": postedQuizzes.length,
            "publicStats.publicQuestionsPublished": publicQuestionsPublished,
            "publicStats.publicQuizAttemptsReceived":
              publicQuizAttemptsReceived,
            "publicStats.publicQuizParticipantsReached":
              publicQuizParticipantsReached,
          },
        },
      );

      updated++;
    }

    return res.status(200).json({
      message: "User public stats recalculated successfully",
      updated,
    });
  } catch (error) {
    console.error("Error in recalculateUserPublicStats controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function seedPostedQuizStats(req, res) {
  try {
    const { items = [], settings = {} } = req.body;

    const shouldUpdateUsers = settings.updateUserPublicStats !== false;
    const shouldUpdateQuizzes = settings.updatePublicQuizSummaryStats !== false;
    const includeAttemptEvents = settings.includeAttemptEvents !== false;

    const requestedEmails = Array.isArray(items)
      ? items
          .map((item) => item.userEmail || item.email)
          .filter(Boolean)
      : [];

    const userQuery =
      requestedEmails.length > 0
        ? { email: { $in: requestedEmails } }
        : {};

    const users = await User.find(userQuery);

    const publicQuizzes = await PublicQuiz.find({});
    const publicAttempts = await PublicQuizAttempt.find({});

    const publicAttemptEvents = includeAttemptEvents
      ? await PublicQuizAttemptEvent.find({})
      : [];

    let updatedUsers = 0;
    let updatedQuizzes = 0;
    let skippedUsers = 0;
    let failed = 0;

    const errors = [];

    function getAttemptCount(attempt) {
      return Number(attempt.attemptCount || 1);
    }

    function getDurationSeconds(attempt) {
      if (Number(attempt.totalDurationSeconds || 0) > 0) {
        return Number(attempt.totalDurationSeconds);
      }

      const attemptCount = getAttemptCount(attempt);
      const durationSeconds = Number(attempt.durationSeconds || 0);

      return durationSeconds * attemptCount;
    }

    function getAverage(values) {
      const validValues = values.filter((value) => Number.isFinite(value));

      if (validValues.length === 0) {
        return 0;
      }

      return Math.round(
        validValues.reduce((sum, value) => sum + value, 0) / validValues.length,
      );
    }

    if (shouldUpdateQuizzes) {
      for (const quiz of publicQuizzes) {
        try {
          const quizId = quiz._id.toString();

          const quizAttempts = publicAttempts.filter((attempt) => {
            return attempt.publicQuizId?.toString() === quizId;
          });

          const quizEvents = publicAttemptEvents.filter((event) => {
            return event.publicQuizId?.toString() === quizId;
          });

          const hasEvents = quizEvents.length > 0;

          const attemptCount = hasEvents
            ? quizEvents.length
            : quizAttempts.reduce((sum, attempt) => {
                return sum + getAttemptCount(attempt);
              }, 0);

          const participantEmails = hasEvents
            ? quizEvents.map((event) => event.userEmail)
            : quizAttempts.map((attempt) => attempt.userEmail);

          const participantCount = new Set(participantEmails).size;

          const averagePercentage = hasEvents
            ? getAverage(quizEvents.map((event) => Number(event.percentage || 0)))
            : getAverage(
                quizAttempts.map((attempt) =>
                  Number(attempt.percentage || 0),
                ),
              );

          const averagePoints = hasEvents
            ? getAverage(
                quizEvents.map((event) => Number(event.pointsEarned || 0)),
              )
            : getAverage(
                quizAttempts.map((attempt) =>
                  Number(attempt.pointsEarned || 0),
                ),
              );

          await PublicQuiz.findByIdAndUpdate(quiz._id, {
            $set: {
              attemptCount,
              participantCount,
              averagePercentage,
              averagePoints,
            },
          });

          updatedQuizzes++;
        } catch (error) {
          failed++;

          errors.push({
            publicQuizId: quiz._id,
            title: quiz.title,
            message: error.message,
          });
        }
      }
    }

    if (shouldUpdateUsers) {
      for (const user of users) {
        try {
          const postedQuizzes = publicQuizzes.filter((quiz) => {
            return quiz.authorEmail === user.email;
          });

          const postedQuizIds = postedQuizzes.map((quiz) =>
            quiz._id.toString(),
          );

          const attemptsMadeByUser = publicAttempts.filter((attempt) => {
            return attempt.userEmail === user.email;
          });

          const eventsMadeByUser = publicAttemptEvents.filter((event) => {
            return event.userEmail === user.email;
          });

          const attemptsReceivedByPostedQuizzes = publicAttempts.filter(
            (attempt) => {
              return postedQuizIds.includes(attempt.publicQuizId?.toString());
            },
          );

          const eventsReceivedByPostedQuizzes = publicAttemptEvents.filter(
            (event) => {
              return postedQuizIds.includes(event.publicQuizId?.toString());
            },
          );

          const publicQuestionsPublished = postedQuizzes.reduce((sum, quiz) => {
            return sum + (quiz.questions?.length || 0);
          }, 0);

          const publicQuizzesAttempted = attemptsMadeByUser.reduce(
            (sum, attempt) => {
              return sum + getAttemptCount(attempt);
            },
            0,
          );

          const publicQuizAttemptsReceived =
            eventsReceivedByPostedQuizzes.length > 0
              ? eventsReceivedByPostedQuizzes.length
              : attemptsReceivedByPostedQuizzes.reduce((sum, attempt) => {
                  return sum + getAttemptCount(attempt);
                }, 0);

          const publicQuizParticipantsReached = new Set(
            attemptsReceivedByPostedQuizzes.map((attempt) => attempt.userEmail),
          ).size;

          const totalPoints = attemptsMadeByUser.reduce((sum, attempt) => {
            return sum + Number(attempt.pointsEarned || 0);
          }, 0);

          const totalTimeSpentSeconds =
            eventsMadeByUser.length > 0
              ? eventsMadeByUser.reduce((sum, event) => {
                  return sum + Number(event.durationSeconds || 0);
                }, 0)
              : attemptsMadeByUser.reduce((sum, attempt) => {
                  return sum + getDurationSeconds(attempt);
                }, 0);

          await User.findOneAndUpdate(
            { email: user.email },
            {
              $set: {
                "publicStats.totalPoints": totalPoints,
                "publicStats.publicQuizzesAttempted": publicQuizzesAttempted,
                "publicStats.publicQuizzesPublished": postedQuizzes.length,
                "publicStats.publicQuestionsPublished":
                  publicQuestionsPublished,
                "publicStats.publicQuizAttemptsReceived":
                  publicQuizAttemptsReceived,
                "publicStats.publicQuizParticipantsReached":
                  publicQuizParticipantsReached,
                "publicStats.totalTimeSpentSeconds": totalTimeSpentSeconds,
              },
            },
            { new: true },
          );

          updatedUsers++;
        } catch (error) {
          failed++;

          errors.push({
            userEmail: user.email,
            message: error.message,
          });
        }
      }
    }

    return res.status(200).json({
      message: "Posted quiz stats seed completed.",
      received: users.length,
      created: updatedUsers + updatedQuizzes,
      updatedUsers,
      updatedQuizzes,
      skipped: skippedUsers,
      failed,
      errors,
      summary: {
        usersScanned: users.length,
        publicQuizzesScanned: publicQuizzes.length,
        publicAttemptsScanned: publicAttempts.length,
        publicAttemptEventsScanned: publicAttemptEvents.length,
      },
    });
  } catch (error) {
    console.error("Error in seedPostedQuizStats controller", error);

    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}