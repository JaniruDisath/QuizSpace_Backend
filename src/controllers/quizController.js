import Quiz from "../models/Quiz.js";

export async function getAllQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });

    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error in getAllQuizzes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getQuizById(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userEmail: userEmail,
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json(quiz);
  } catch (error) {
    console.error("Error in getQuizById controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createQuiz(req, res) {
  try {
    const { title, description, folderId, questions, userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const newQuiz = new Quiz({
      title,
      description,
      folderId: folderId || null,
      userEmail,
      questions: questions || [],
    });

    await newQuiz.save();

    res.status(201).json({
      message: "Quiz created successfully",
      quiz: newQuiz,
    });
  } catch (error) {
    console.error("Error in createQuiz controller", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateQuiz(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const { title, description, folderId, questions } = req.body;

    const updatedQuiz = await Quiz.findOneAndUpdate(
      {
        _id: req.params.id,
        userEmail: userEmail,
      },
      {
        title,
        description,
        folderId,
        questions,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json({
      message: "Quiz updated successfully",
      quiz: updatedQuiz,
    });
  } catch (error) {
    console.error("Error in updateQuiz controller", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteQuiz(req, res) {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const deletedQuiz = await Quiz.findOneAndDelete({
      _id: req.params.id,
      userEmail: userEmail,
    });

    if (!deletedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error in deleteQuiz controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getQuizzesByFolder(req, res) {
  try {
    const { folderId, userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "User email is required" });
    }

    const query = {
      userEmail: userEmail,
      folderId: !folderId || folderId === "null" ? null : folderId,
    };

    const quizzes = await Quiz.find(query).sort({ createdAt: -1 });

    res.status(200).json(quizzes);
  } catch (error) {
    console.error("Error in getQuizzesByFolder controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
