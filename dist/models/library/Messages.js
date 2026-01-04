"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EChatType = exports.EMessageStatus = exports.Message = void 0;
const mongoose_1 = require("mongoose");
var EChatType;
(function (EChatType) {
    EChatType[EChatType["group"] = 1] = "group";
    EChatType[EChatType["personal"] = 2] = "personal";
})(EChatType || (exports.EChatType = EChatType = {}));
var EMessageStatus;
(function (EMessageStatus) {
    EMessageStatus[EMessageStatus["sent"] = 1] = "sent";
    EMessageStatus[EMessageStatus["delivered"] = 2] = "delivered";
    EMessageStatus[EMessageStatus["read"] = 3] = "read";
})(EMessageStatus || (exports.EMessageStatus = EMessageStatus = {}));
const schema = new mongoose_1.Schema({
    senderId: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    chatType: { type: Number, required: true, enum: EChatType, default: EChatType.personal },
    message: { type: String || null, required: false, default: '' },
    status: { type: Number, required: true, enum: EMessageStatus, default: EMessageStatus.sent },
    readBy: { type: [String], default: [] },
}, {
    timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' },
});
const Message = (0, mongoose_1.model)('Message', schema, 'Message');
exports.Message = Message;
