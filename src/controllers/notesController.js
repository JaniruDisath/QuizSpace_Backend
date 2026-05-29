import Note from "../models/Note.js";

export async function getAllNotes(req, res) {
  try {
    const notes = await Note.find();
    res.status(200).json(notes);
  } catch (error) {
    console.error("Error in getAllNotes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getNoteById(req, res) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (error) {
    console.error("Error in getNoteById controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createNotes(req, res) {
  try {
    const { title, content } = req.body;
    const newNote = new Note({ title, content });

    await newNote.save();
    res.status(201).json({ message: "Note Created Successfully" });
  } catch (error) {
    console.error("Error in createNotes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateNotes(req, res) {
  try {
    const { title, content } = req.body;
    const updatedNote = await Note.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true },
    );

    if (!updatedNote)
      return res.status(404).json({ message: "Note note found" });
    res.status(200).json({ message: "Note updated successfully" });
  } catch (error) {
    console.error("Error in updateNotes controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteNotes(req, res) {
  try {
    const updatedNote = await Note.findByIdAndDelete(req.params.id);
    if (!updatedNote)
      return res.status(404).json({ message: "Note note found" });
    res.status(200).json({ message: "Note Deleted successfully" });
  } catch (error) {
    console.error("Error in deleteNotes  controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
