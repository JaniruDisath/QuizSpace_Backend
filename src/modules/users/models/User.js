import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    publicStats: {
      totalPoints: {
        type: Number,
        default: 0,
      },

      publicQuizzesAttempted: {
        type: Number,
        default: 0,
      },

      publicQuizzesPublished: {
        type: Number,
        default: 0,
      },

      publicQuestionsPublished: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema, "users");

export default User;
