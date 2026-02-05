"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootSocket = void 0;
const models_1 = require("./models");
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
        // users
        if (!this.socket.eventNames().includes("userList")) {
            this.socket.on("userList", this.userList.bind(this));
        }
        // fetch all chats
        if (!this.socket.eventNames().includes("dashBoard")) {
            this.socket.on("dashBoard", this.dashBoard.bind(this));
        }
        //create group
        if (!this.socket.eventNames().includes("createGroup")) {
            this.socket.on("createGroup", this.createGroup.bind(this));
        }
        // message
        if (!this.socket.eventNames().includes("message")) {
            this.socket.on("message", this.message.bind(this));
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
    async userList(body, _ack) {
        try {
            const user = await models_1.User.find({}).lean();
            if (typeof _ack === "function")
                return _ack({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: user || [],
                });
        }
        catch (err) {
            console.error(`Failed to update`);
        }
    }
    async dashBoard(body, _ack) {
        try {
            const userId = db_1.M.mongify(this.userId);
            const conversations = await models_1.Conversation.find({
                $or: [
                    { users: userId.toString(), channelId: { $exists: true } }, // group chats
                    { users: userId.toString() }, // personal chats
                ],
            }).lean();
            console.log("Conversation", conversations);
            if (!conversations.length) {
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: [],
                });
            }
            const groupConvos = conversations.filter((c) => c.chatType === models_1.EChatType.group && c.channelId);
            const channelIds = groupConvos.map((c) => c.channelId);
            const channels = await models_1.Channel.find({ _id: { $in: channelIds } }, { channelName: 1 }).lean();
            const all_users = await models_1.User.find({}).lean();
            const users = all_users.filter((p) => p._id.toString() != this.userId);
            console.log("Users ", users);
            const dashboard = conversations.map((conv) => {
                // GROUP CHAT
                if (conv.chatType === models_1.EChatType.group) {
                    const channel = channels.find((c) => c._id.toString() === conv.channelId?.toString());
                    return {
                        chatId: conv._id,
                        type: models_1.EChatType.group,
                        name: channel?.channelName ?? "Unknown Group",
                        channelId: conv.channelId,
                    };
                }
                // PERSONAL CHAT 
                const otherUserId = conv.users.includes(this.userId)
                    ? conv.users.find(id => id !== this.userId)
                    : null;
                console.log("otherUserId ", otherUserId);
                const otherUser = users.find((u) => u._id.toString() === otherUserId?.toString());
                console.log("otherUser ", users);
                return {
                    chatId: conv._id,
                    type: models_1.EChatType.personal,
                    name: otherUser?.name ?? otherUser?.userName ?? "Unknown User",
                    userId: otherUserId,
                };
            });
            return _ack?.({
                success: response_1.response.SUCCESS.code,
                errormessage: response_1.response.SUCCESS.message,
                response: dashboard,
            });
        }
        catch (err) { }
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
            await models_1.Conversation.create({
                channelId: channel._id,
                chatType: models_1.EChatType.group,
                users: users.map((p) => p.userId.toString()),
                message: [],
            });
            users.forEach((u) => this.socket.to(u).emit("groupCreated", channel));
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
    async message(body, _ack) {
        try {
            console.log("Body", body.userId);
            if (!body.type)
                return _ack?.({
                    success: response_1.response.CLIENT_ERROR.code,
                    errormessage: response_1.response.CLIENT_ERROR.message,
                });
            if (body.type === 1 && body.channelId) {
                const channelId = db_1.M.mongify(body.channelId);
                const [sender, channel] = await Promise.all([
                    models_1.User.findById(db_1.M.mongify(this.userId)).lean(),
                    models_1.Channel.findById(channelId).lean(),
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
                const message = await models_1.Message.create({
                    senderId: sender._id,
                    channelId: channel._id,
                    message: body.message ?? "",
                    chatType: models_1.EChatType.group,
                    status: models_1.EMessageStatus.sent,
                });
                await models_1.Conversation.findOneAndUpdate({ channelId: channel._id }, {
                    $setOnInsert: {
                        channelId,
                        chatType: models_1.EChatType.group,
                        users: channel.users.map(p => p.userId.toString()),
                    },
                    $push: { message: message._id },
                }, { upsert: true });
                this.socket.to(channelId.toString()).emit("newMessage", message);
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: message,
                });
            }
            else if (body.type === 2 && body.userId) {
                const user_Id = db_1.M.mongify(body.userId);
                const [sender, receiverId] = await Promise.all([
                    models_1.User.findById(db_1.M.mongify(this.userId)).lean(),
                    models_1.User.findById(db_1.M.mongify(body.userId)).lean(),
                ]);
                if (!sender) {
                    return _ack?.({
                        success: response_1.response.USER_NOT_FOUND.code,
                        errormessage: response_1.response.USER_NOT_FOUND.message,
                    });
                }
                if (!receiverId) {
                    return _ack?.({
                        success: response_1.response.USER_NOT_FOUND.code,
                        errormessage: response_1.response.USER_NOT_FOUND.message,
                    });
                }
                const message = await models_1.Message.create({
                    senderId: sender._id,
                    receiverId: receiverId._id,
                    message: body.message ?? "",
                    chatType: models_1.EChatType.personal,
                    status: models_1.EMessageStatus.sent,
                });
                const convo = await models_1.Conversation.findOne({ users: { $all: [this.userId, body.userId] } }).lean();
                console.log("Convp", convo);
                if (convo) {
                    await models_1.Conversation.findOneAndUpdate({ users: { $all: [this.userId, body.userId] } }, {
                        $push: { message: message._id },
                    }, { upsert: true });
                }
                else {
                    await models_1.Conversation.insertOne({
                        chatType: models_1.EChatType.personal,
                        users: [this.userId, body.userId],
                        message: [message._id],
                    });
                }
                this.socket.to(body.userId).emit("newMessage", message);
                return _ack?.({
                    success: response_1.response.SUCCESS.code,
                    errormessage: response_1.response.SUCCESS.message,
                    response: message,
                });
            }
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
                models_1.Conversation.findByIdAndUpdate({ "users.userId": db_1.M.mongify(this.userId) }, { $pull: { users: this.userId } }, { new: true }),
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
}
exports.rootSocket = rootSocket;
