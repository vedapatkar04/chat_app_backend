"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootSocket = void 0;
const models_1 = require("../src/models");
const response_1 = require("./util/response");
const db_1 = require("./config/db");
class rootSocket {
    constructor(socket) {
        this.socket = socket;
        this.userId = socket.data.userId;
        this.authToken = socket.data.authToken;
        this.setEventListeners();
        this.toDos();
        console.log(`client: ${this.userId} connected with socketId: ${socket.id}`);
    }
    setEventListeners() {
        if (!this.socket.eventNames().includes("error")) {
            this.socket.on("error", this.errorHandler.bind(this));
        }
        if (!this.socket.eventNames().includes("disconnect")) {
            this.socket.on("disconnect", this.disconnect.bind(this));
        }
        // update user profile
        if (!this.socket.eventNames().includes("updateProfile")) {
            this.socket.on("updateProfile", this.updateProfile.bind(this));
        }
        //create group
        if (!this.socket.eventNames().includes("createGroup")) {
            this.socket.on("createGroup", this.createGroup.bind(this));
        }
        // leave group
        if (!this.socket.eventNames().includes("leaveGroup")) {
            this.socket.on("leaveGroup", this.leaveGroup.bind(this));
        }
        // message
        if (!this.socket.eventNames().includes("disconnect")) {
            this.socket.on("disconnect", this.disconnect.bind(this));
        }
        // delete message
        if (!this.socket.eventNames().includes("disconnect")) {
            this.socket.on("disconnect", this.disconnect.bind(this));
        }
        //logout
        if (!this.socket.eventNames().includes("disconnect")) {
            this.socket.on("disconnect", this.disconnect.bind(this));
        }
    }
    async toDos() {
        try {
            await models_1.User.findByIdAndUpdate({ _id: db_1.M.mongify(this.userId) }, {
                socketId: this.socket.id,
                isOnline: true,
            });
            console.log(`User ${this.userId} connected with socket ${this.socket.id}`);
            return true;
        }
        catch (err) {
            console.error(` toDo Failed. reason: '${err.message}'`);
            return false;
        }
    }
    errorHandler(err) {
        console.error(`Socket error for user ${this.userId}: ${err.message}`);
    }
    async disconnect() {
        try {
            await models_1.User.findByIdAndUpdate({ _id: db_1.M.mongify(this.userId) }, {
                socketId: null,
                isOnline: false,
            });
            console.log(`User ${this.userId} disconnected with socketId: ${this.socket.id}`);
        }
        catch (err) {
            console.error(`Failed to disconnect`);
        }
    }
    async updateProfile(body, _ack) {
        try {
            const user = await models_1.User.findById({ _id: db_1.M.mongify(this.userId) }).lean();
            if (!user)
                if (typeof _ack === "function")
                    return _ack({
                        success: response_1.response.USER_NOT_FOUND.code,
                        errormessage: response_1.response.USER_NOT_FOUND.message,
                    });
            await models_1.User.findByIdAndUpdate({ _id: db_1.M.mongify(this.userId) }, {
                name: body.name,
            });
            if (typeof _ack === "function")
                return _ack({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: "Updated successfully",
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async createGroup(body, _ack) {
        try {
            const creator = await models_1.User.findById(this.userId).lean();
            if (!creator) {
                return _ack?.({
                    success: response_1.response.USER_NOT_FOUND.code,
                    errormessage: response_1.response.USER_NOT_FOUND.message,
                });
            }
            const users = [
                {
                    userId: creator._id,
                    name: creator.name,
                },
                ...body.participants
                    .filter((p) => p.userId !== creator._id.toString())
                    .map((p) => ({
                    userId: db_1.M.mongify(p.userId),
                    name: p.name || "",
                })),
            ];
            const channel = await models_1.Channel.create({
                channelName: body.channelName,
                users,
                status: models_1.EChannelStatus.active,
            });
            return _ack?.({
                success: response_1.response.SUCCESS.code,
                errormessage: response_1.response.SUCCESS.message,
                response: channel,
            });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async leaveGroup(body, _ack) {
        try {
            const [creator, channel] = await Promise.all([
                models_1.User.findById(this.userId).lean(),
                models_1.Channel.findById({ _id: db_1.M.mongify(body.channelId) }).lean(),
            ]);
            if (!creator) {
                return _ack?.({
                    success: response_1.response.USER_NOT_FOUND.code,
                    errormessage: response_1.response.USER_NOT_FOUND.message,
                });
            }
            if (!channel) {
                return _ack?.({
                    success: response_1.response.CHANNEL_NOT_FOUND.code,
                    errormessage: response_1.response.CHANNEL_NOT_FOUND.message,
                });
            }
            const updatedChannel = await models_1.Channel.findByIdAndUpdate(db_1.M.mongify(body.channelId), { $pull: { users: { userId: new db_1.Types.ObjectId(this.userId) } } }, { new: true });
            return _ack?.({
                success: response_1.response.SUCCESS.code,
                errormessage: response_1.response.SUCCESS.message,
                response: channel,
            });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
}
exports.rootSocket = rootSocket;
