import mongoose from "mongoose";

const publicAttemptEventAnswerSchema = new mongoose.Schema(
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
      default: 0,
    },
  },
  { _id: false }
);

const publicQuizAttemptEventSchema = new mongoose.Schema(
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

    answers: {
      type: [publicAttemptEventAnswerSchema],
      default: [],
    },

    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

publicQuizAttemptEventSchema.index({ publicQuizId: 1, attemptedAt: -1 });
publicQuizAttemptEventSchema.index({ userEmail: 1, attemptedAt: -1 });

export default mongoose.model(
  "PublicQuizAttemptEvent",
  publicQuizAttemptEventSchema
);