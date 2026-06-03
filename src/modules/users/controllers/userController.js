import bcrypt from "bcryptjs";
import User from "../models/User.js";

const SALT_ROUNDS = 10;

export async function getUserByEmail(req, res) {
  try {
    const user = await User.findOne({ email: req.params.email }).select(
      "-password",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error in getUserByEmail controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createUser(req, res) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "fullName, email, and password are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "User Created Successfully" });
  } catch (error) {
    console.error("Error in createUser controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateUser(req, res) {
  try {
    const { fullName, email, password } = req.body;

    const updateData = {};

    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    if (email !== undefined) {
      updateData.email = email;
    }

    if (password !== undefined && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateUser controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteUser(req, res) {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User Deleted successfully" });
  } catch (error) {
    console.error("Error in deleteUser controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function checkUserCredentials(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(false);
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json(false);
    }

    let isPasswordCorrect = false;

    const isHashedPassword = user.password.startsWith("$2a$") ||
      user.password.startsWith("$2b$");

    if (isHashedPassword) {
      isPasswordCorrect = await bcrypt.compare(password, user.password);
    } else {
      // Temporary legacy support for old plain-text users.
      isPasswordCorrect = user.password === password;

      // If old plain-text password was correct, immediately upgrade it.
      if (isPasswordCorrect) {
        user.password = await bcrypt.hash(password, SALT_ROUNDS);
        await user.save();
      }
    }

    if (!isPasswordCorrect) {
      return res.status(200).json(false);
    }

    res.status(200).json(true);
  } catch (error) {
    console.error("Error in checkUserCredentials controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}