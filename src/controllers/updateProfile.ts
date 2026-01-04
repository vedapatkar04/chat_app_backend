import { Request as req, Response as res } from "express";
import { User } from "../models";

async function updateProfile(req: req, res: res) {
  try {
    const { email, name } = req.body;

    //if user exist
    const existing_user = await User.findOne({ email: email }).lean();
    if (!existing_user)
      return res.status(400).json({ message: "Invalid credentials" });

    await User.updateOne({ email: email }, { $set: { name: name } });

    res.json({
      message: "update successful",
      user: {
        id: existing_user._id,
        name: name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
}

export { updateProfile };
