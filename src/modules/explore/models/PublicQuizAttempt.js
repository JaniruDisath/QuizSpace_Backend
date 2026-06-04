import mongoose from "mongoose";

const publicAttemptAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    selectedOptionIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    isCorrect: {
      type: Boolean,
      required: true,
    },

    pointsEarned: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const publicQuizAttemptSchema = new mongoose.Schema(
  {
    publicQuizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PublicQuiz",
      required: true,
    },

    userEmail: {
      type: String,
      required: true,
      trim: true,
    },

    userName: {
      type: String,
      trim: true,
      default: "QuizSpace User",
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

    pointsEarned: {
      type: Number,
      required: true,
      min: 0,
    },

    durationSeconds: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    attemptCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    answers: {
      type: [publicAttemptAnswerSchema],
      default: [],
    },

    bestAttemptAt: {
      type: Date,
      default: Date.now,
    },

    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

publicQuizAttemptSchema.index(
  { publicQuizId: 1, userEmail: 1 },
  { unique: true },
);

export default mongoose.model("PublicQuizAttempt", publicQuizAttemptSchema);