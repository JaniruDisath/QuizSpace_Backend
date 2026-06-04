import express from "express";

import {
  getPublicCategories,
  createPublicCategory,
} from "../controllers/publicCategoryController.js";

const router = express.Router();

router.get("/", getPublicCategories);

router.post("/", createPublicCategory);

export default router;