import express from "express"
import {getUserByEmail, createUser, updateUser, deleteUser, checkUserCredentials } from "../controllers/userController.js";

const router = express.Router();

router.get("/:email", getUserByEmail );

router.post("/check-user", checkUserCredentials);

router.post("/", createUser);
 
router.put("/:id", updateUser);

router.delete("/:id", deleteUser);


export default router