import dns from "node:dns/promises";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import dotenv from "dotenv";
import express from "express";
import cors from "cors"

import { connectDB } from "./config/db.js";

import userRoutes from "./modules/users/routes/userRoutes.js";
import rateLimiter from "../middleware/rateLimiter.js";
import folderRoutes from "./modules/workspace/routes/folderRoutes.js";
import quizRoutes from "./modules/workspace/routes/quizRoutes.js";
import quizScoreRoutes from "./modules/workspace/routes/quizScoreRoutes.js";

import publicQuizRoutes from "./modules/explore/routes/publicQuizRoutes.js";
import publicQuizAttemptRoutes from "./modules/explore/routes/publicQuizAttemptRoutes.js";
import leaderboardRoutes from "./modules/explore/routes/leaderboardRoutes.js";
import publicCategoryRoutes from "./modules/explore/routes/publicCategoryRoutes.js";

import devSeedRoutes from "./modules/devSeed/routes/devSeedRoutes.js";
import publicCreatorRoutes from "./modules/explore/routes/publicCreatorRoutes.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;


//Middleware
// app.use(express.json()); // This Middleware will parse JSON bodies: req.body
app.use(express.json({ limit: "2mb" })); // Same thing with size limitter. GIves 413 for requests with json over 2mb

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.originalUrl);
  next();
});


app.use(rateLimiter);
app.use(cors())

//Our simple custome middleware
// app.use((req,res,next) => {
//   console.log(`Req method is ${req.method} & Req URL is ${req.url}`);
//   next();
// })

app.use("/api/user", userRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/quiz-scores", quizScoreRoutes);

app.use("/api/explore/quizzes", publicQuizRoutes);
app.use("/api/explore/attempts", publicQuizAttemptRoutes);
app.use("/api/explore/leaderboard", leaderboardRoutes);
app.use("/api/explore/categories", publicCategoryRoutes);

app.use("/api/dev-seed", devSeedRoutes);
app.use("/api/explore/creator", publicCreatorRoutes);

//First connect with the database, if the connection successfull, the application will start
connectDB().then(() => {
  app.listen(5001, () => {
    console.log("Servier started on PORT : ", PORT);
  });
});
