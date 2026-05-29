import User from "../models/User.js";

export async function getUserByEmail(req, res) {
  try {
    const user = await User.findOne({ email: req.params.email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error in getUserById controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createUser(req, res) {
  try {
    const { fullName, email, password } = req.body;

    const newUser = new User({
      fullName,
      email,
      password,
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

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        fullName,
        email,
        password,
      },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully" });
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

    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(200).json(false);
    }

    res.status(200).json(true);
  } catch (error) {
    console.error("Error in checkUserCredentials controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
