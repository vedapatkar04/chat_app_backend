import { Request as req, Response as res } from "express";
import { User } from "../models";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

async function login(req: req, res: res) {
  try {
    const { userName, email, password } = req.body;

    //if user exist
    const existing_user = await User.findOne({ email: email }).lean();
    if (!existing_user)
      return res.status(400).json({ message: "Invalid credentials" });

    // Password match
    const password_match = await bcrypt.compare(
      password,
      existing_user.password
    );
    if (!password_match)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: existing_user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    await User.updateOne({ email }, { $set: { authToken: token } });

    res.json({
      message: "Login successfull",
      responseMsg: {
        userId: existing_user._id,
        email: existing_user.email,
        authToken: token,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
}

export { login };
