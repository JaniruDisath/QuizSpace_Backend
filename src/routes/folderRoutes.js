import express from "express";
import {
  createFolder,
  getFoldersByParent,
  renameFolder,
  deleteFolder,
} from "../controllers/folderController.js";

const router = express.Router();

router.post("/", createFolder);
router.get("/", getFoldersByParent);
router.put("/:id", renameFolder);
router.delete("/:id", deleteFolder);

export default router;