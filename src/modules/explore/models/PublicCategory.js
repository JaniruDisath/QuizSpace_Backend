import mongoose from "mongoose";

const publicCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    icon: {
      type: String,
      trim: true,
      default: "bi-grid",
    },

    color: {
      type: String,
      trim: true,
      default: "primary",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PublicCategory", publicCategorySchema);