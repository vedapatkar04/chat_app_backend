"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const models_1 = require("../models");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function register(req, res) {
    try {
        const { userName, email, password } = req.body;
        //if user exist
        const existing_user = await models_1.User.findOne({ email: email }).lean();
        if (existing_user)
            return res.status(400).json({ message: "User Already Exist" });
        // Password match
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await models_1.User.create({
            userName,
            email,
            password: hashedPassword,
        });
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });
        await models_1.User.updateOne({ email }, { $set: { authToken: token } });
        res.json({
            message: "Registered successful",
            responseMsg: {
                userId: user._id,
                userName: userName,
                email: email,
                authToken: token,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}
exports.register = register;
