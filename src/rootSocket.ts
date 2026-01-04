import { Socket } from "socket.io";
import {
  Channel,
  EChannelStatus,
  EChatType,
  EMessageStatus,
  IChannelType,
  Message,
  User,
} from "../src/models";
import { response as RES } from "./util/response";
import { M, Types } from "./config/db";
import { response } from "express";

export class rootSocket {
  socket: Socket;
  userId: string;
  authToken: string;

  constructor(socket: Socket) {
    this.socket = socket;
    this.userId = socket.data.userId;
    this.authToken = socket.data.authToken;

    this.setEventListeners();
    this.toDos();
    console.log(`client: ${this.userId} connected with socketId: ${socket.id}`);
  }

  private setEventListeners() {
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

  private async toDos() {
    try {
      await User.findByIdAndUpdate(
        { _id: M.mongify(this.userId) },
        {
          socketId: this.socket.id,
          isOnline: true,
        }
      );
      console.log(
        `User ${this.userId} connected with socket ${this.socket.id}`
      );
      return true;
    } catch (err: any) {
      console.error(` toDo Failed. reason: '${err.message}'`);
      return false;
    }
  }

  private errorHandler(err: any) {
    console.error(`Socket error for user ${this.userId}: ${err.message}`);
  }

  private async disconnect() {
    try {
      await User.findByIdAndUpdate(
        { _id: M.mongify(this.userId) },
        {
          socketId: null,
          isOnline: false,
        }
      );
      console.log(
        `User ${this.userId} disconnected with socketId: ${this.socket.id}`
      );
    } catch (err) {
      console.error(`Failed to disconnect`);
    }
  }

  private async updateProfile(body: { name: string }, _ack?: Function) {
    try {
      const user = await User.findById({ _id: M.mongify(this.userId) }).lean();

      if (!user)
        if (typeof _ack === "function")
          return _ack({
            success: RES.USER_NOT_FOUND.code,
            errormessage: RES.USER_NOT_FOUND.message,
          });

      await User.findByIdAndUpdate(
        { _id: M.mongify(this.userId) },
        {
          name: body.name,
        }
      );

      if (typeof _ack === "function")
        return _ack({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: "Updated successfully",
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async createGroup(
    body: {
      channelName: string;
      participants: { userId: string; name: string }[];
    },
    _ack?: Function
  ) {
    try {
      const creator = await User.findById(this.userId).lean();

      if (!creator) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      const users: any = [
        {
          userId: creator._id,
          name: creator.name,
        },

        ...body.participants
          .filter((p) => p.userId !== creator._id.toString())
          .map((p) => ({
            userId: M.mongify(p.userId),
            name: p.name || "",
          })),
      ];

      const channel = await Channel.create({
        channelName: body.channelName,
        users,
        status: EChannelStatus.active,
      });

      return _ack?.({
        success: RES.SUCCESS.code,
        errormessage: RES.SUCCESS.message,
        response: channel,
      });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async leaveGroup(
    body: {
      channelId: string;
    },
    _ack?: Function
  ) {
    try {
      const [creator, channel] = await Promise.all([
        User.findById(this.userId).lean(),
        Channel.findById({ _id: M.mongify(body.channelId) }).lean(),
      ]);

      if (!creator) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      if (!channel) {
        return _ack?.({
          success: RES.CHANNEL_NOT_FOUND.code,
          errormessage: RES.CHANNEL_NOT_FOUND.message,
        });
      }

      const updatedChannel = await Channel.findByIdAndUpdate(
        M.mongify(body.channelId),
        { $pull: { users: { userId: new Types.ObjectId(this.userId) } } },
        { new: true }
      );

      return _ack?.({
        success: RES.SUCCESS.code,
        errormessage: RES.SUCCESS.message,
        response: channel,
      });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async personalChat(
    body: {
      userId: string;
      message: string;
    },
    _ack?: Function
  ) {
    try {
      const [sender, receiver] = await Promise.all([
        User.findById(this.userId).lean(),
        User.findById(body.userId).lean(),
      ]);

      if (!sender) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      if (!receiver) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      await Message.create({
        senderId: sender._id,
        receiverId: receiver._id,
        message: body.message,
        chatType: EChatType.personal,
        status: EMessageStatus.sent,
      });

      return _ack?.({
        success: RES.SUCCESS.code,
        errormessage: RES.SUCCESS.message,
        response: "Message Sent",
      });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async groupChat(
    body: {
      chatId: string;
      message: string;
    },
    _ack?: Function
  ) {
    try {
      const [sender, channel] = await Promise.all([
        User.findById(this.userId).lean(),
        Channel.findById(body.chatId).lean(),
      ]);

      if (!sender) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      if (!channel) {
        return _ack?.({
          success: RES.CHANNEL_NOT_FOUND.code,
          errormessage: RES.CHANNEL_NOT_FOUND.message,
        });
      }

      await Message.create({
        senderId: sender._id,
        channelId: channel._id,
        message: body.message,
        chatType: EChatType.group,
        status: EMessageStatus.sent,
      });

      return _ack?.({
        success: RES.SUCCESS.code,
        errormessage: RES.SUCCESS.message,
        response: "Message Sent",
      });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async logOut(body: {}, _ack?: Function) {
    try {
      const user = await User.findById(this.userId).lean();

      if (!user) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      await User.findByIdAndUpdate(
        { _id: M.mongify(this.userId) },
        { $set: { authToken: "deleted", socketId: null, isOnline: false } }
      );
      return _ack?.({
        success: RES.SUCCESS.code,
        errormessage: RES.SUCCESS.message,
        response: "Message Sent",
      });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async deleteProfile(body: {}, _ack?: Function) {
    try {
      const user = await User.findById(this.userId).lean();

      if (!user) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      await Promise.all([
        User.findByIdAndDelete({ _id: M.mongify(this.userId) }),
        Channel.findByIdAndUpdate(
          { "users.userId": M.mongify(this.userId) },
          { $pull: { users: { userId: new Types.ObjectId(this.userId) } } },
          { new: true }
        ),
      ]);
      return _ack?.({
        success: RES.SUCCESS.code,
        errormessage: RES.SUCCESS.message,
        response: "Message Sent",
      });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }
}
