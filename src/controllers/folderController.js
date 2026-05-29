import mongoose from "mongoose";
import Folder from "../models/Folder.js";

function normalizeParentFolderId(parentFolderId) {
  if (
    !parentFolderId ||
    parentFolderId === "null" ||
    parentFolderId === "undefined"
  ) {
    return null;
  }

  return parentFolderId;
}

// CREATE FOLDER
export async function createFolder(req, res) {
  try {
    const { folderName, folderColor, parentFolderId, userEmail } = req.body;

    if (!folderName || !userEmail) {
      return res.status(400).json({
        message: "Folder name and user email are required.",
      });
    }

    const normalizedParentId = normalizeParentFolderId(parentFolderId);

    if (
      normalizedParentId &&
      !mongoose.Types.ObjectId.isValid(normalizedParentId)
    ) {
      return res.status(400).json({
        message: "Invalid parent folder ID.",
      });
    }

    const newFolder = await Folder.create({
      folderName,
      folderColor: folderColor || "primary",
      parentFolderId: normalizedParentId,
      userEmail,
    });

    res.status(201).json(newFolder);
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// GET FOLDERS INSIDE CURRENT FOLDER
export async function getFoldersByParent(req, res) {
  try {
    const { parentFolderId, userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({
        message: "User email is required.",
      });
    }

    const normalizedParentId = normalizeParentFolderId(parentFolderId);

    if (
      normalizedParentId &&
      !mongoose.Types.ObjectId.isValid(normalizedParentId)
    ) {
      return res.status(400).json({
        message: "Invalid parent folder ID.",
      });
    }

    const folders = await Folder.find({
      userEmail,
      parentFolderId: normalizedParentId,
    }).sort({ createdAt: 1 });

    res.status(200).json(folders);
  } catch (error) {
    console.error("Error getting folders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// RENAME FOLDER
export async function renameFolder(req, res) {
  try {
    const { id } = req.params;
    const { folderName, userEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid folder ID.",
      });
    }

    if (!folderName || !userEmail) {
      return res.status(400).json({
        message: "Folder name and user email are required.",
      });
    }

    const updatedFolder = await Folder.findOneAndUpdate(
      {
        _id: id,
        userEmail,
      },
      {
        folderName,
      },
      { new: true }
    );

    if (!updatedFolder) {
      return res.status(404).json({
        message: "Folder not found.",
      });
    }

    res.status(200).json(updatedFolder);
  } catch (error) {
    console.error("Error renaming folder:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Helper function for recursive delete
async function collectFolderAndChildren(folderId, userEmail, idsToDelete = []) {
  idsToDelete.push(folderId);

  const childFolders = await Folder.find({
    parentFolderId: folderId,
    userEmail,
  }).select("_id");

  for (const child of childFolders) {
    await collectFolderAndChildren(child._id, userEmail, idsToDelete);
  }

  return idsToDelete;
}

// DELETE FOLDER AND ITS CHILD FOLDERS
export async function deleteFolder(req, res) {
  try {
    const { id } = req.params;
    const { userEmail } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid folder ID.",
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        message: "User email is required.",
      });
    }

    const folder = await Folder.findOne({
      _id: id,
      userEmail,
    });

    if (!folder) {
      return res.status(404).json({
        message: "Folder not found.",
      });
    }

    const idsToDelete = await collectFolderAndChildren(id, userEmail);

    await Folder.deleteMany({
      _id: { $in: idsToDelete },
      userEmail,
    });

    res.status(200).json({
      message: "Folder and child folders deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}