import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    seedKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    folderName: {
      type: String,
      required: true,
      trim: true,
    },

    folderColor: {
      type: String,
      default: "primary",
    },

    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },

    userEmail: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

folderSchema.index({ userEmail: 1, parentFolderId: 1 });
  
const Folder = mongoose.model("Folder", folderSchema);

export default Folder;