import mongoose from "mongoose";

const publicOptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true },
);

const publicQuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    options: {
      type: [publicOptionSchema],
      required: true,
      validate: {
        validator: function (options) {
          return Array.isArray(options) && options.length >= 2;
        },
        message: "Each public question must have at least 2 options.",
      },
    },

    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    focusArea: {
      type: String,
      trim: true,
      default: "",
    },

    explanation: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true },
);

publicQuestionSchema.pre("validate", function () {
  if (
    Array.isArray(this.options) &&
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
      required: true,
      validate: {
        validator: function (questions) {
          return Array.isArray(questions) && questions.length > 0;
        },
        message: "A public quiz must have at least one question.",
      },
    },

    pointsPerQuestion: {
      type: Number,
      default: 10,
      min: 1,
    },

    status: {
      type: String,
      enum: ["published", "hidden"],
      default: "published",
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

export default mongoose.model("PublicQuiz", publicQuizSchema);
