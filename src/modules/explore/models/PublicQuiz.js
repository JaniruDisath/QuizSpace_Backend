import mongoose from "mongoose";

const publicOptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true },
);

const publicQuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      trim: true,
      default: "",
    },

    options: {
      type: [publicOptionSchema],
      default: [],
    },

    correctOptionIndex: {
      type: Number,
      min: 0,
      default: 0,
    },

    focusArea: {
      type: String,
      trim: true,
      default: "",
    },

    explanation: {
      type: String,
      trim: true,
      default: "",
    },

    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

publicQuestionSchema.pre("validate", function () {
  if (
    Array.isArray(this.options) &&
    this.options.length > 0 &&
    this.correctOptionIndex >= this.options.length
  ) {
    this.invalidate(
      "correctOptionIndex",
      "Correct option index must match one of the available options.",
    );
  }
});

const publicQuizSchema = new mongoose.Schema(
  {
    seedKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    categoryName: {
      type: String,
      required: true,
      trim: true,
      default: "General Knowledge",
    },

    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },

    authorEmail: {
      type: String,
      required: true,
      trim: true,
    },

    authorName: {
      type: String,
      trim: true,
      default: "QuizSpace User",
    },

    sourcePrivateQuizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
    },

    questions: {
      type: [publicQuestionSchema],
      default: [],
    },

    pointsPerQuestion: {
      type: Number,
      default: 10,
      min: 1,
    },

    status: {
      type: String,
      enum: ["published", "hidden"],
      default: "hidden",
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    participantCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    averagePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    averagePoints: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

publicQuizSchema.index({ authorEmail: 1, status: 1 });
publicQuizSchema.index({ categoryName: 1, difficulty: 1, status: 1 });

export default mongoose.models.PublicQuiz ||
  mongoose.model("PublicQuiz", publicQuizSchema);