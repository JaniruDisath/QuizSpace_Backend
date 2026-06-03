import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true },
);

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      trim: true,
      default: "",
    },

    options: {
      type: [optionSchema],
      required: true,
      validate: {
        validator: function (options) {
          return Array.isArray(options) && options.length >= 2;
        },
        message: "Each question must have at least 2 answer options.",
      },
    },

    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: function (value) {
          return (
            Array.isArray(this.options) &&
            this.options.length > 0 &&
            value >= 0 &&
            value < this.options.length
          );
        },
        message:
          "Correct option index must match one of the available options.",
      },
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

const quizSchema = new mongoose.Schema(
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

    quizColor: {
      type: String,
      trim: true,
      default: "success",
    },

    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    userEmail: {
      type: String,
      required: true,
      trim: true,
    },

    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Quiz", quizSchema);
