import dns from "node:dns/promises";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import dotenv from "dotenv";
import express from "express";
import cors from "cors"

import notesRoutes from "./routes/notesRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { connectDB } from "./config/db.js";
import rateLimiter from "../middleware/rateLimiter.js";
import folderRoutes from "./routes/folderRoutes.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

//Middleware
app.use(express.json()); // This Middleware will parse JSON bodies: req.body
app.use(rateLimiter);
app.use(cors())

//Our simple custome middleware
// app.use((req,res,next) => {
//   console.log(`Req method is ${req.method} & Req URL is ${req.url}`);
//   next();
// })

app.use("/api/notes", notesRoutes);
app.use("/api/user", userRoutes);
app.use("/api/folders", folderRoutes);


//First connect with the database, if the connection successfull, the application will start
connectDB().then(() => {
  app.listen(5001, () => {
    console.log("Servier started on PORT : ", PORT);
  });
});
