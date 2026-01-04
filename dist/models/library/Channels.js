"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EChannelStatus = exports.Channel = void 0;
const mongoose_1 = require("mongoose");
var EChannelStatus;
(function (EChannelStatus) {
    EChannelStatus[EChannelStatus["active"] = 1] = "active";
    EChannelStatus[EChannelStatus["deactivated"] = 2] = "deactivated";
})(EChannelStatus || (exports.EChannelStatus = EChannelStatus = {}));
const schema = new mongoose_1.Schema({
    channelName: { type: String, required: true, index: true },
    users: { type: [
            {
                _id: false,
                userId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: "User" },
                userName: { type: String, default: '' },
            },
        ],
        required: true,
        default: []
    },
    status: { type: Number, required: true, enum: EChannelStatus, default: EChannelStatus.active },
}, {
    timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' },
});
const Channel = (0, mongoose_1.model)('Channel', schema, 'Channel');
exports.Channel = Channel;
