"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Conversation = void 0;
const mongoose_1 = require("mongoose");
var EChatType;
(function (EChatType) {
    EChatType[EChatType["group"] = 1] = "group";
    EChatType[EChatType["personal"] = 2] = "personal";
})(EChatType || (EChatType = {}));
const schema = new mongoose_1.Schema({
    channelId: { type: mongoose_1.Schema.Types.ObjectId, required: false },
    chatType: {
        type: Number,
        required: true,
        enum: EChatType,
        default: EChatType.personal,
    },
    users: { type: [String], default: [] },
    message: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            required: false,
        },
    ],
}, {
    timestamps: { createdAt: "dCreatedAt", updatedAt: "dUpdatedAt" },
});
const Conversation = (0, mongoose_1.model)("Conversation", schema, "Conversation");
exports.Conversation = Conversation;
