"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = void 0;
const models_1 = require("../models");
async function updateProfile(req, res) {
    try {
        const { email, name } = req.body;
        //if user exist
        const existing_user = await models_1.User.findOne({ email: email }).lean();
        if (!existing_user)
            return res.status(400).json({ message: "Invalid credentials" });
        await models_1.User.updateOne({ email: email }, { $set: { name: name } });
        res.json({
            message: "update successful",
            user: {
                id: existing_user._id,
                name: name,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}
exports.updateProfile = updateProfile;
