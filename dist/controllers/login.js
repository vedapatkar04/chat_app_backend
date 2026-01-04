"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const models_1 = require("../models");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function login(req, res) {
    try {
        const { userName, email, password } = req.body;
        //if user exist
        const existing_user = await models_1.User.findOne({ email: email }).lean();
        if (!existing_user)
            return res.status(400).json({ message: "Invalid credentials" });
        // Password match
        const password_match = await bcryptjs_1.default.compare(password, existing_user.password);
        if (!password_match)
            return res.status(400).json({ message: "Invalid credentials" });
        const token = jsonwebtoken_1.default.sign({ id: existing_user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        await models_1.User.updateOne({ email }, { $set: { authToken: token } });
        res.json({
            message: "Login successfull",
            responseMsg: {
                userId: existing_user._id,
                email: existing_user.email,
                authToken: token,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}
exports.login = login;
