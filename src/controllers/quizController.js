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
    const quiz = await Quiz.findById(req.params.id);

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
    const { title, description, folderId, questions } = req.body;

    const newQuiz = new Quiz({
      title,
      description,
      folderId: folderId || null,
      questions: questions || [],
    });

    await newQuiz.save();

    res.status(201).json({
      message: "Quiz created successfully",
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
    const { title, description, folderId, questions } = req.body;

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        folderId,
        questions,
      },
      {
        new: true,
        runValidators: true,
      }
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
    const deletedQuiz = await Quiz.findByIdAndDelete(req.params.id);

    if (!deletedQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error in deleteQuiz controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}