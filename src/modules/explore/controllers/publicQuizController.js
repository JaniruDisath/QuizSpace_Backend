import PublicQuiz from "../models/PublicQuiz.js";
import PublicQuizAttempt from "../models/PublicQuizAttempt.js";
import Quiz from "../../workspace/models/Quiz.js";
import User from "../../../modules/users/models/User.js";

import PublicCategory from "../models/PublicCategory.js";

function validatePublicQuizData(quizData) {
  if (!quizData.title || quizData.title.trim() === "") {
    return "Public quiz title is required.";
  }

  if (!quizData.authorEmail || quizData.authorEmail.trim() === "") {
    return "Author email is required.";
  }

  if (!quizData.questions || quizData.questions.length === 0) {
    return "Public quiz must have at least one question.";
  }

  for (let i = 0; i < quizData.questions.length; i++) {
    const question = quizData.questions[i];

    if (!question.questionText || question.questionText.trim() === "") {
      return `Question ${i + 1} is missing question text.`;
    }

    if (!question.options || question.options.length < 2) {
      return `Question ${i + 1} must have at least 2 options.`;
    }

    for (let j = 0; j < question.options.length; j++) {
      if (!question.options[j].text || question.options[j].text.trim() === "") {
        return `Question ${i + 1}, option ${j + 1} is empty.`;
      }
    }

    if (
      question.correctOptionIndex === undefined ||
      question.correctOptionIndex < 0 ||
      question.correctOptionIndex >= question.options.length
    ) {
      return `Question ${i + 1} has an invalid correct answer.`;
    }

    if (!question.explanation || question.explanation.trim() === "") {
      return `Question ${i + 1} is missing explanation.`;
    }
  }

  return null;
}

function buildCleanQuestions(questions) {
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

export async function getPublicQuizzes(req, res) {
  try {
    const { search = "", categoryName = "All", difficulty = "All" } = req.query;

    const query = {
      status: "published",
    };

    if (categoryName !== "All") {
      query.categoryName = categoryName;
    }

    if (difficulty !== "All") {
      query.difficulty = difficulty;
    }

    if (search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
        { authorName: { $regex: search.trim(), $options: "i" } },
        { categoryName: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const publicQuizzes = await PublicQuiz.find(query).sort({
      createdAt: -1,
    });

    const categories = await PublicCategory.find({ isActive: true });

    console.log(
      "CATEGORY IMAGE CHECK:",
      categories.map((category) => ({
        categoryName: category.categoryName,
        imageUrl: category.imageUrl,
      })),
    );

    const categoryMap = new Map(
      categories.map((category) => [
        category.categoryName,
        {
          imageUrl: category.imageUrl || "",
          imageAlt: category.imageAlt || "",
          imageCreditUrl: category.imageCreditUrl || "",
          icon: category.icon || "bi-grid",
          color: category.color || "primary",
        },
      ]),
    );

    const enrichedQuizzes = publicQuizzes.map((quiz) => {
      const quizObject = quiz.toObject();
      const category = categoryMap.get(quiz.categoryName);

      return {
        ...quizObject,
        categoryImageUrl: category?.imageUrl || "",
        categoryImageAlt:
          category?.imageAlt || `${quiz.categoryName} quiz image`,
        categoryImageCreditUrl: category?.imageCreditUrl || "",
        categoryIcon: category?.icon || "bi-grid",
        categoryColor: category?.color || "primary",
      };
    });

    res.status(200).json(enrichedQuizzes);

    console.log("FIRST ENRICHED QUIZ IMAGE:", {
      title: enrichedQuizzes[0]?.title,
      categoryName: enrichedQuizzes[0]?.categoryName,
      categoryImageUrl: enrichedQuizzes[0]?.categoryImageUrl,
    });
  } catch (error) {
    console.error("Error in getPublicQuizzes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyPublicQuizzes(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const quizzes = await PublicQuiz.find({
      authorEmail: userEmail,
    }).sort({ createdAt: -1 });

    const categories = await PublicCategory.find({ isActive: true });

    const categoryMap = new Map(
      categories.map((category) => [
        category.categoryName,
        {
          imageUrl: category.imageUrl || "",
          imageAlt: category.imageAlt || "",
          imageCreditUrl: category.imageCreditUrl || "",
          icon: category.icon || "bi-grid",
          color: category.color || "primary",
        },
      ]),
    );

    const enrichedQuizzes = quizzes.map((quiz) => {
      const quizObject = quiz.toObject();
      const category = categoryMap.get(quiz.categoryName);

      return {
        ...quizObject,
        categoryImageUrl: category?.imageUrl || "",
        categoryImageAlt:
          category?.imageAlt || `${quiz.categoryName} quiz image`,
        categoryImageCreditUrl: category?.imageCreditUrl || "",
        categoryIcon: category?.icon || "bi-grid",
        categoryColor: category?.color || "primary",
      };
    });

    return res.status(200).json(enrichedQuizzes);
  } catch (error) {
    console.error("Error in getMyPublicQuizzes controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getPublicQuizById(req, res) {
  try {
    const quiz = await PublicQuiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    if (quiz.status !== "published") {
      const { userEmail } = req.query;

      if (!userEmail || userEmail !== quiz.authorEmail) {
        return res.status(404).json({ message: "Public quiz not found" });
      }
    }

    const category = await PublicCategory.findOne({
      categoryName: quiz.categoryName,
      isActive: true,
    });

    const quizObject = quiz.toObject();

    return res.status(200).json({
      ...quizObject,
      categoryImageUrl: category?.imageUrl || "",
      categoryImageAlt: category?.imageAlt || `${quiz.categoryName} quiz image`,
      categoryImageCreditUrl: category?.imageCreditUrl || "",
      categoryIcon: category?.icon || "bi-grid",
      categoryColor: category?.color || "primary",
    });
  } catch (error) {
    console.error("Error in getPublicQuizById controller", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createPublicQuiz(req, res) {
  try {
    const {
      title,
      description,
      categoryName,
      difficulty,
      authorEmail,
      authorName,
      questions,
      pointsPerQuestion,
      status,
    } = req.body;

    const validationError = validatePublicQuizData({
      title,
      authorEmail,
      questions,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await User.findOne({ email: authorEmail });

    const publicQuiz = new PublicQuiz({
      title,
      description: description || "",
      categoryName: categoryName || "General Knowledge",
      difficulty: difficulty || "Beginner",
      authorEmail,
      authorName: authorName || user?.fullName || "QuizSpace User",
      sourcePrivateQuizId: null,
      pointsPerQuestion: pointsPerQuestion || 10,
      questions: buildCleanQuestions(questions),
      status: status || "published",
    });

    await publicQuiz.save();

    await User.findOneAndUpdate(
      { email: authorEmail },
      {
        $inc: {
          "publicStats.publicQuizzesPublished": 1,
          "publicStats.publicQuestionsPublished": publicQuiz.questions.length,
        },
      },
    );

    res.status(201).json({
      message: "Public quiz created successfully",
      publicQuiz,
    });
  } catch (error) {
    console.error("Error in createPublicQuiz controller", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function publishPrivateQuiz(req, res) {
  try {
    const {
      privateQuizId,
      userEmail,
      categoryName,
      difficulty,
      pointsPerQuestion,
    } = req.body;

    if (!privateQuizId || !userEmail) {
      return res.status(400).json({
        message: "privateQuizId and userEmail are required",
      });
    }

    const privateQuiz = await Quiz.findOne({
      _id: privateQuizId,
      userEmail,
    });

    if (!privateQuiz) {
      return res.status(404).json({ message: "Private quiz not found" });
    }

    const validationError = validatePublicQuizData({
      title: privateQuiz.title,
      authorEmail: userEmail,
      questions: privateQuiz.questions,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await User.findOne({ email: userEmail });

    const publicQuiz = new PublicQuiz({
      title: privateQuiz.title,
      description: privateQuiz.description || "",
      categoryName: categoryName || "General Knowledge",
      difficulty: difficulty || "Beginner",
      authorEmail: userEmail,
      authorName: user?.fullName || "QuizSpace User",
      sourcePrivateQuizId: privateQuiz._id,
      pointsPerQuestion: pointsPerQuestion || 10,
      questions: buildCleanQuestions(privateQuiz.questions),
      status: "published",
    });

    await publicQuiz.save();

    await User.findOneAndUpdate(
      { email: userEmail },
      {
        $inc: {
          "publicStats.publicQuizzesPublished": 1,
          "publicStats.publicQuestionsPublished": publicQuiz.questions.length,
        },
      },
    );

    res.status(201).json({
      message: "Quiz published successfully",
      publicQuiz,
    });
  } catch (error) {
    console.error("Error in publishPrivateQuiz controller", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updatePublicQuiz(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const existingQuiz = await PublicQuiz.findById(req.params.id);

    if (!existingQuiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    if (existingQuiz.authorEmail !== userEmail) {
      return res.status(403).json({
        message: "You can only update public quizzes you created.",
      });
    }

    const {
      title,
      description,
      categoryName,
      difficulty,
      questions,
      pointsPerQuestion,
      status,
    } = req.body;

    const nextQuestions = questions || existingQuiz.questions;

    const validationError = validatePublicQuizData({
      title: title || existingQuiz.title,
      authorEmail: existingQuiz.authorEmail,
      questions: nextQuestions,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const previousQuestionCount = existingQuiz.questions.length;
    const nextQuestionCount = nextQuestions.length;
    const questionCountDifference = nextQuestionCount - previousQuestionCount;

    existingQuiz.title = title || existingQuiz.title;
    existingQuiz.description =
      description !== undefined ? description : existingQuiz.description;
    existingQuiz.categoryName = categoryName || existingQuiz.categoryName;
    existingQuiz.difficulty = difficulty || existingQuiz.difficulty;
    existingQuiz.pointsPerQuestion =
      pointsPerQuestion || existingQuiz.pointsPerQuestion;
    existingQuiz.status = status || existingQuiz.status;
    existingQuiz.questions = buildCleanQuestions(nextQuestions);

    await existingQuiz.save();

    if (questionCountDifference !== 0) {
      await User.findOneAndUpdate(
        { email: userEmail },
        {
          $inc: {
            "publicStats.publicQuestionsPublished": questionCountDifference,
          },
        },
      );
    }

    res.status(200).json({
      message: "Public quiz updated successfully",
      publicQuiz: existingQuiz,
    });
  } catch (error) {
    console.error("Error in updatePublicQuiz controller", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updatePublicQuizStatus(req, res) {
  try {
    const { userEmail } = req.query;
    const { status } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    if (!["published", "hidden"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either published or hidden.",
      });
    }

    const updatedQuiz = await PublicQuiz.findOneAndUpdate(
      {
        _id: req.params.id,
        authorEmail: userEmail,
      },
      { status },
      { new: true, runValidators: true },
    );

    if (!updatedQuiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    res.status(200).json({
      message: "Public quiz status updated successfully",
      publicQuiz: updatedQuiz,
    });
  } catch (error) {
    console.error("Error in updatePublicQuizStatus controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deletePublicQuiz(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const deletedQuiz = await PublicQuiz.findOneAndDelete({
      _id: req.params.id,
      authorEmail: userEmail,
    });

    if (!deletedQuiz) {
      return res.status(404).json({ message: "Public quiz not found" });
    }

    await PublicQuizAttempt.deleteMany({
      publicQuizId: deletedQuiz._id,
    });

    await User.findOneAndUpdate(
      { email: userEmail },
      {
        $inc: {
          "publicStats.publicQuizzesPublished": -1,
          "publicStats.publicQuestionsPublished": -deletedQuiz.questions.length,
        },
      },
    );

    res.status(200).json({
      message: "Public quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error in deletePublicQuiz controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
