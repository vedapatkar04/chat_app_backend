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
        // addUserInGroup
        if (!this.socket.eventNames().includes("addUserInGroup")) {
            this.socket.on("addUserInGroup", this.addUserInGroup.bind(this));
        }
        // joinGroup
        if (!this.socket.eventNames().includes("joinGroup")) {
            this.socket.on("joinGroup", this.joinGroup.bind(this));
        }
        // leave group
        if (!this.socket.eventNames().includes("leaveGroup")) {
            this.socket.on("leaveGroup", this.leaveGroup.bind(this));
        }
        // message
        if (!this.socket.eventNames().includes("message")) {
            this.socket.on("message", this.message.bind(this));
        }
        // groupChat message
        if (!this.socket.eventNames().includes("chat")) {
            this.socket.on("chat", this.chat.bind(this));
        }
        // personalChat
        if (!this.socket.eventNames().includes("personalChat")) {
            this.socket.on("personalChat", this.personalChat.bind(this));
        }
        // deleteProfiles
        if (!this.socket.eventNames().includes("deleteProfiles")) {
            this.socket.on("deleteProfile", this.deleteProfile.bind(this));
        }
        //logout
        if (!this.socket.eventNames().includes("logOut")) {
            this.socket.on("logOut", this.logOut.bind(this));
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
                lastSeen: new Date(),
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
            const creator = await models_1.User.findById(db_1.M.mongify(this.userId)).lean();
            if (!creator) {
                return _ack?.({
                    success: response_1.response.USER_NOT_FOUND.code,
                    errormessage: response_1.response.USER_NOT_FOUND.message,
                });
            }
            const users = [
                {
                    userId: creator._id,
                    userName: creator.userName,
                },
                ...body.participants
                    .filter((p) => p.userId !== creator._id.toString())
                    .map((p) => ({
                    userId: db_1.M.mongify(p.userId),
                    userName: p.userName ?? "",
                })),
            ];
            const channel = await models_1.Channel.create({
                channelName: body.channelName,
                users,
                status: models_1.EChannelStatus.active,
            });
            if (typeof _ack === "function")
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
    async addUserInGroup(body, _ack) {
        try {
            const [creator, channel] = await Promise.all([
                models_1.User.findById(db_1.M.mongify(this.userId)).lean(),
                models_1.Channel.findById(db_1.M.mongify(body.channelId)),
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
            const new_users = body.participants
                .filter((p) => p.userId !== creator._id.toString())
                .map((p) => ({
                userId: db_1.M.mongify(p.userId),
                userName: p.userName ?? "",
            }));
            const data = await models_1.Channel.findByIdAndUpdate(channel._id, {
                $addToSet: {
                    users: {
                        $each: new_users,
                    },
                },
            }, { new: true });
            if (typeof _ack === "function")
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: data,
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async joinGroup(body, _ack) {
        try {
            const [user, channel] = await Promise.all([
                models_1.User.findById(db_1.M.mongify(this.userId)).lean(),
                models_1.Channel.findById(db_1.M.mongify(body.channelId)),
            ]);
            if (!user) {
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
            const data = await models_1.Channel.findByIdAndUpdate(channel._id, {
                $addToSet: {
                    users: {
                        userId: user._id,
                        userName: user.userName,
                    },
                },
            }, { new: true });
            if (typeof _ack === "function")
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: data,
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
            if (!body.kickUser)
                return _ack?.({
                    success: response_1.response.CLIENT_ERROR.code,
                    errormessage: response_1.response.CLIENT_ERROR.message,
                });
            let updatedChannel;
            if (body.kickUser === true) {
                //
                if (!body.userId)
                    return _ack?.({
                        success: response_1.response.CLIENT_ERROR.code,
                        errormessage: response_1.response.CLIENT_ERROR.message,
                    });
                const user_to_remove = await models_1.User.findById(db_1.M.mongify(body.userId)).lean();
                updatedChannel = await models_1.Channel.findByIdAndUpdate(db_1.M.mongify(body.channelId), { $pull: { users: { userId: user_to_remove?._id } } }, { new: true });
            }
            else {
                updatedChannel = await models_1.Channel.findByIdAndUpdate(db_1.M.mongify(body.channelId), { $pull: { users: { userId: db_1.M.mongify(this.userId) } } }, { new: true });
            }
            if (typeof _ack === "function")
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: updatedChannel,
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async message(body, _ack) {
        try {
            if (!body.type)
                return _ack?.({
                    success: response_1.response.CLIENT_ERROR.code,
                    errormessage: response_1.response.CLIENT_ERROR.message,
                });
            if (body.type == 1) {
                if (!body.channelId)
                    return _ack?.({
                        success: response_1.response.CLIENT_ERROR.code,
                        errormessage: response_1.response.CLIENT_ERROR.message,
                    });
                const [sender, channel] = await Promise.all([
                    models_1.User.findById(db_1.M.mongify(this.userId)).lean(),
                    models_1.Channel.findById(db_1.M.mongify(body.channelId)).lean(),
                ]);
                if (!sender) {
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
                await models_1.Message.create({
                    senderId: sender._id,
                    channelId: channel._id,
                    message: body.message ?? "",
                    chatType: models_1.EChatType.group,
                    status: models_1.EMessageStatus.sent,
                });
            }
            if (body.type == 2) {
                const [sender, receiver] = await Promise.all([
                    models_1.User.findById(db_1.M.mongify(this.userId)).lean(),
                    models_1.User.findById(db_1.M.mongify(body.userId)).lean(),
                ]);
                if (!sender) {
                    return _ack?.({
                        success: response_1.response.USER_NOT_FOUND.code,
                        errormessage: response_1.response.USER_NOT_FOUND.message,
                    });
                }
                if (!receiver) {
                    return _ack?.({
                        success: response_1.response.USER_NOT_FOUND.code,
                        errormessage: response_1.response.USER_NOT_FOUND.message,
                    });
                }
                await models_1.Message.create({
                    senderId: sender._id,
                    receiverId: receiver._id,
                    message: body.message ?? "",
                    chatType: models_1.EChatType.personal,
                    status: models_1.EMessageStatus.sent,
                });
            }
            else {
                return _ack?.({
                    success: response_1.response.INVALID.code,
                    errormessage: response_1.response.INVALID.message,
                });
            }
            if (typeof _ack === "function")
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: "Message Sent",
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async chat(body, _ack) {
        try {
            const channel = await models_1.Channel.findById(db_1.M.mongify(body.chatId)).lean();
            if (!channel)
                return _ack?.({
                    success: response_1.response.CHANNEL_NOT_FOUND.code,
                    errormessage: response_1.response.CHANNEL_NOT_FOUND.message,
                });
            const chats = await models_1.Message.find({ channelId: channel._id }, { senderId: 1, message: 1, readBy: 1 }).lean();
            const userIds = chats.map((chat) => chat.senderId);
            const users = await models_1.User.find({ _id: { $in: userIds } }, { name: 1 }).lean();
            const messagesWithUserNames = chats.map((chat) => {
                const user = users.find((u) => u._id.toString() === chat.senderId.toString());
                return {
                    message: chat.message,
                    name: user ? user.name : "Unknown",
                    readBy: chat.readBy,
                };
            });
            if (typeof _ack === "function")
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: messagesWithUserNames ?? [],
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async logOut(body, _ack) {
        try {
            const user = await models_1.User.findById(db_1.M.mongify(this.userId)).lean();
            if (!user) {
                return _ack?.({
                    success: response_1.response.USER_NOT_FOUND.code,
                    errormessage: response_1.response.USER_NOT_FOUND.message,
                });
            }
            await models_1.User.findByIdAndUpdate(db_1.M.mongify(this.userId), {
                $set: { authToken: "deleted", socketId: null, isOnline: false },
            });
            if (typeof _ack === "function")
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: "Logged out",
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async deleteProfile(body, _ack) {
        try {
            const user = await models_1.User.findById(db_1.M.mongify(this.userId)).lean();
            if (!user) {
                return _ack?.({
                    success: response_1.response.USER_NOT_FOUND.code,
                    errormessage: response_1.response.USER_NOT_FOUND.message,
                });
            }
            await Promise.all([
                models_1.User.findByIdAndDelete({ _id: db_1.M.mongify(this.userId) }),
                models_1.Channel.findByIdAndUpdate({ "users.userId": db_1.M.mongify(this.userId) }, { $pull: { users: { userId: db_1.M.mongify(this.userId) } } }, { new: true }),
            ]);
            if (typeof _ack === "function")
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: "Deleted Successfully",
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async personalChat(body, _ack) {
        try {
            const messages = await models_1.Message.find({
                chatType: models_1.EChatType.personal,
            }).lean();
            const filtered_nessages = messages.filter((p) => p.senderId.toString() === this.userId &&
                p.receiverId?.toString() === body.userId);
            if (typeof _ack === "function")
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: filtered_nessages,
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
}
exports.rootSocket = rootSocket;
