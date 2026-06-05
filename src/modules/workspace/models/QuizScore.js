import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    selectedOptionIndex: {
      type: Number,
      required: true,
    },

    correctOptionIndex: {
      type: Number,
      required: true,
    },

    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false },
);

const quizScoreSchema = new mongoose.Schema(
  {
    seedKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },

    userEmail: {
      type: String,
      required: true,
      trim: true,
    },

    score: {
      type: Number,
      required: true,
      min: 0,
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },

    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    answers: {
      type: [answerSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("QuizScore", quizScoreSchema);