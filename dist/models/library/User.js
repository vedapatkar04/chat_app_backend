"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const schema = new mongoose_1.Schema({
    userName: { type: String, index: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: false, default: '' },
    authToken: { type: String, required: false, default: '' },
    socketId: { type: String, required: false, default: '' },
    isOnline: { type: Boolean, required: false, default: true },
    lastSeen: { type: Date, required: false, default: new Date() },
    lastSeenChatId: { type: mongoose_1.Schema.Types.ObjectId, required: false },
}, {
    timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' },
});
schema.index({ email: 1 });
const User = (0, mongoose_1.model)('User', schema, 'User');
exports.User = User;
