import PublicCategory from "../models/PublicCategory.js";

export async function getPublicCategories(req, res) {
  try {
    const categories = await PublicCategory.find({ isActive: true }).sort({
      categoryName: 1,
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error("Error in getPublicCategories controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createPublicCategory(req, res) {
  try {
    const { categoryName, icon, color } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const newCategory = new PublicCategory({
      categoryName,
      icon,
      color,
    });

    await newCategory.save();

    res.status(201).json({
      message: "Public category created successfully",
      category: newCategory,
    });
  } catch (error) {
    console.error("Error in createPublicCategory controller", error);

    if (error.code === 11000) {
      return res.status(400).json({ message: "Category already exists" });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
}