import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
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
      validate: {
        validator: function (value) {
          return (
            Array.isArray(this.options) &&
            value >= 0 &&
            value < this.options.length
          );
        },
        message: "Correct option index must match one of the available options.",
      },
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
  { _id: true }
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

    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    questions: {
      type: [questionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);