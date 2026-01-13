import { Socket } from "socket.io";
import {
  Channel,
  Conversation,
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
import { ObjectId } from "mongoose";

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
          lastSeen: new Date(),
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
      participants: { userId: string; userName: string }[];
    },
    _ack?: Function
  ) {
    try {
      const creator = await User.findById(M.mongify(this.userId)).lean();

      if (!creator) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      const users: any = [
        {
          userId: creator._id,
          userName: creator.userName,
        },

        ...body.participants
          .filter((p) => p.userId !== creator._id.toString())
          .map((p) => ({
            userId: M.mongify(p.userId),
            userName: p.userName ?? "",
          })),
      ];

      const channel = await Channel.create({
        channelName: body.channelName,
        users,
        status: EChannelStatus.active,
      });

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: channel,
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async addUserInGroup(
    body: {
      channelId: string;
      participants: { userId: string; userName: string }[];
    },
    _ack?: Function
  ) {
    try {
      const [creator, channel] = await Promise.all([
        User.findById(M.mongify(this.userId)).lean(),
        Channel.findById(M.mongify(body.channelId)),
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

      const new_users: any = body.participants
        .filter((p) => p.userId !== creator._id.toString())
        .map((p) => ({
          userId: M.mongify(p.userId),
          userName: p.userName ?? "",
        }));

      const data = await Channel.findByIdAndUpdate(
        channel._id,
        {
          $addToSet: {
            users: {
              $each: new_users,
            },
          },
        },
        { new: true }
      );

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: data,
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async joinGroup(
    body: {
      channelId: string;
    },
    _ack?: Function
  ) {
    try {
      const [user, channel] = await Promise.all([
        User.findById(M.mongify(this.userId)).lean(),
        Channel.findById(M.mongify(body.channelId)),
      ]);

      if (!user) {
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

      const data = await Channel.findByIdAndUpdate(
        channel._id,
        {
          $addToSet: {
            users: {
              userId: user._id,
              userName: user.userName,
            },
          },
        },
        { new: true }
      );

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: data,
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async leaveGroup(
    body: {
      channelId: string;
      kickUser: boolean;
      userId?: string;
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

      if (!body.kickUser)
        return _ack?.({
          success: RES.CLIENT_ERROR.code,
          errormessage: RES.CLIENT_ERROR.message,
        });

      let updatedChannel;

      if (body.kickUser === true) {
        //
        if (!body.userId)
          return _ack?.({
            success: RES.CLIENT_ERROR.code,
            errormessage: RES.CLIENT_ERROR.message,
          });

        const user_to_remove = await User.findById(
          M.mongify(body.userId)
        ).lean();

        updatedChannel = await Channel.findByIdAndUpdate(
          M.mongify(body.channelId),
          { $pull: { users: { userId: user_to_remove?._id } } },
          { new: true }
        );
      } else {
        updatedChannel = await Channel.findByIdAndUpdate(
          M.mongify(body.channelId),
          { $pull: { users: { userId: M.mongify(this.userId) } } },
          { new: true }
        );
      }

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: updatedChannel,
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async message(
    body: {
      userId: string;
      type: number;
      channelId?: string;
      message: string;
    },
    _ack?: Function
  ) {
    try {
      if (!body.type)
        return _ack?.({
          success: RES.CLIENT_ERROR.code,
          errormessage: RES.CLIENT_ERROR.message,
        });

      if (body.type == 1) {
        console.log("Inside type 1");
        if (!body.channelId)
          return _ack?.({
            success: RES.CLIENT_ERROR.code,
            errormessage: RES.CLIENT_ERROR.message,
          });

        const [sender, channel] = await Promise.all([
          User.findById(M.mongify(this.userId)).lean(),
          Channel.findById(M.mongify(body.channelId)).lean(),
          ,
        ]);

        async function convo(conversation: ObjectId) {
          try {
            const convo = await Conversation.findOne({
              channelId: conversation,
            }).lean();
            return convo;
          } catch (err) {}
        }
        let convo_doc = await convo(channel?._id!);

        console.log(convo_doc);
        const user_list = channel?.users.map((p) => p.userId.toString());

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

        const message_created = new Message({
          senderId: sender._id,
          channelId: channel._id,
          message: body.message ?? "",
          chatType: EChatType.group,
          status: EMessageStatus.sent,
        });

        if (!convo_doc) {
          console.log("Inside convo");
          convo_doc = await Conversation.create({
            channelId: channel._id,
            users: user_list,
            chatType: EChatType.group,
            message: [],
          });

          if (message_created) {
            convo_doc.message.push(message_created._id);
          }
        }
      } else if (body.type == 2) {
        const [sender, receiver] = await Promise.all([
          User.findById(M.mongify(this.userId)).lean(),
          User.findById(M.mongify(body.userId)).lean(),
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
          message: body.message ?? "",
          chatType: EChatType.personal,
          status: EMessageStatus.sent,
        });
      } else {
        return _ack?.({
          success: RES.INVALID.code,
          errormessage: RES.INVALID.message,
        });
      }

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: "Message Sent",
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async chat(
    body: {
      chatId: string;
    },
    _ack?: Function
  ) {
    try {
      const channel = await Channel.findById(M.mongify(body.chatId)).lean();

      if (!channel)
        return _ack?.({
          success: RES.CHANNEL_NOT_FOUND.code,
          errormessage: RES.CHANNEL_NOT_FOUND.message,
        });

      const chats = await Message.find(
        { channelId: channel._id },
        { senderId: 1, message: 1, readBy: 1 }
      ).lean();

      const userIds = chats.map((chat) => chat.senderId);
      const users = await User.find(
        { _id: { $in: userIds } },
        { name: 1 }
      ).lean();

      const messagesWithUserNames = chats.map((chat) => {
        const user = users.find(
          (u) => u._id.toString() === chat.senderId.toString()
        );
        return {
          message: chat.message,
          name: user ? user.name : "Unknown",
          readBy: chat.readBy,
        };
      });

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: messagesWithUserNames ?? [],
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async logOut(body: {}, _ack?: Function) {
    try {
      const user = await User.findById(M.mongify(this.userId)).lean();

      if (!user) {
        return _ack?.({
          success: RES.USER_NOT_FOUND.code,
          errormessage: RES.USER_NOT_FOUND.message,
        });
      }

      await User.findByIdAndUpdate(M.mongify(this.userId), {
        $set: { authToken: "deleted", socketId: null, isOnline: false },
      });

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: "Logged out",
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async deleteProfile(body: {}, _ack?: Function) {
    try {
      const user = await User.findById(M.mongify(this.userId)).lean();

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
          { $pull: { users: { userId: M.mongify(this.userId) } } },
          { new: true }
        ),
      ]);

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: "Deleted Successfully",
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async personalChat(
    body: {
      userId: string;
    },
    _ack?: Function
  ) {
    try {
      const messages = await Message.find({
        chatType: EChatType.personal,
      }).lean();

      const filtered_nessages = messages.filter(
        (p) =>
          p.senderId.toString() === this.userId &&
          p.receiverId?.toString() === body.userId
      );

      if (typeof _ack === "function")
        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: filtered_nessages,
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }
}
