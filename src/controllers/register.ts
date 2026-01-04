import { Request as req, Response as res } from "express";
import { User } from "../models";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

async function register(req: req, res: res) {
  try {
    const { userName, email, password } = req.body;

    //if user exist
    const existing_user = await User.findOne({ email: email }).lean();
    if (existing_user)
      return res.status(400).json({ message: "User Already Exist" });

    // Password match
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      userName,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "1d",
    });

    await User.updateOne({ email }, { $set: { authToken: token } });

    res.json({
      message: "Registered successful",
      responseMsg: {
        userId: user._id,
        userName: userName,
        email: email,
        authToken: token,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
}

export { register };
