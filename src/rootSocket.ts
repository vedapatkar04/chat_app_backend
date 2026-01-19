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


  private async userList(body: { }, _ack?: Function) {
    try {
      const user = await User.find({}).lean();
      if (typeof _ack === "function")
        return _ack({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: user || [],
        });
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async dashBoard(body: {  }, _ack?: Function) {
    try {
      const userId = M.mongify(this.userId);

    const conversations = await Conversation.find({
      $or: [
        { channelId: { $exists: true } }, // group chats
        { users: userId.toString() }, // personal chats
      ],
    }).lean();

    console.log("Conversation", conversations)
    if (!conversations.length) {
      return _ack?.({
        success: RES.SUCCESS.code,
        errormessage: RES.SUCCESS.message,
        response: [],
      });
    }

    const groupConvos = conversations.filter(
      (c) => c.chatType === EChatType.group && c.channelId
    );

    const channelIds = groupConvos.map((c) => c.channelId);
    const channels = await Channel.find(
      { _id: { $in: channelIds } },
      { channelName: 1 }
    ).lean();

    const all_users = await User.find({}).lean();

    const users = all_users.filter((p) => p._id.toString() != this.userId)
    console.log("Users ", users)

    const dashboard = conversations.map((conv) => {
      // GROUP CHAT
      if (conv.chatType === EChatType.group) {
        const channel = channels.find(
          (c) => c._id.toString() === conv.channelId?.toString()
        );

        return {
          chatId: conv._id,
          type: EChatType.group,
          name: channel?.channelName ?? "Unknown Group",
          channelId: conv.channelId,
        };
      }

      // PERSONAL CHAT 
     const otherUserId = conv.users.includes(this.userId)
  ? conv.users.find(id => id !== this.userId)
  : null;
          console.log("otherUserId ", otherUserId)


      const otherUser = users.find(
        (u) => u._id.toString() === otherUserId?.toString()
      );

          console.log("otherUser ", users)

      return {
        chatId: conv._id,
        type: EChatType.personal,
        name: otherUser?.name ?? otherUser?.userName ?? "Unknown User",
        userId: otherUserId,
      };
    });
 
    console.log(dashboard);

    return _ack?.({
      success: RES.SUCCESS.code,
      errormessage: RES.SUCCESS.message,
      response: dashboard,
    });

    } catch (err) {}
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

      await Conversation.create({
        channelId: channel._id,
        chatType: EChatType.group,
        users: users.map((p: any) => p.userId.toString()),
        message: [],
      })

      users.forEach((u: any) =>
        this.socket.to(u).emit("groupCreated", channel)
      );

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
      console.log("Body", body.userId)
      if (!body.type)
        return _ack?.({
          success: RES.CLIENT_ERROR.code,
          errormessage: RES.CLIENT_ERROR.message,
        });

      if (body.type === 1 && body.channelId) {
        const channelId = M.mongify(body.channelId);

        const [sender, channel] = await Promise.all([
          User.findById(M.mongify(this.userId)).lean(),
          Channel.findById(channelId).lean(),
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

        const message = await Message.create({
          senderId: sender._id,
          channelId: channel._id,
          message: body.message ?? "",
          chatType: EChatType.group,
          status: EMessageStatus.sent,
        });

        await Conversation.findOneAndUpdate(
          { channelId: channel._id },
          {
            $setOnInsert: {
              channelId,
              chatType: EChatType.group,
              users: [],
            },
            $push: { message: message._id },
          },
          { upsert: true }
        );

        this.socket.to(channelId.toString()).emit("newMessage", message);

        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: message,
        });
      } else if (body.type === 2 && body.userId) {
        const user_Id = M.mongify(body.userId);

        const [sender, receiverId] = await Promise.all([
          User.findById(M.mongify(this.userId)).lean(),
          User.findById(M.mongify(body.userId)).lean(),
        ]);

        if (!sender) {
          return _ack?.({
            success: RES.USER_NOT_FOUND.code,
            errormessage: RES.USER_NOT_FOUND.message,
          });
        }

        if (!receiverId) {
          return _ack?.({
            success: RES.USER_NOT_FOUND.code,
            errormessage: RES.USER_NOT_FOUND.message,
          });
        }

        const message = await Message.create({
          senderId: sender._id,
          receiverId: receiverId._id,
          message: body.message ?? "",
          chatType: EChatType.personal,
          status: EMessageStatus.sent,
        });

        const convo = await Conversation.findOne({ users: { $all: [this.userId, body.userId] }},).lean()
        console.log("Convp", convo)
        if (convo) {

          await Conversation.findOneAndUpdate(
            { users: { $all: [this.userId, body.userId] }},
            {
              $push: { message: message._id },
            },
            { upsert: true }
          );
        } else {
           await Conversation.insertOne(
              {
                chatType: EChatType.personal,
                users: [this.userId, body.userId],
                message: [message._id ],
              },
          )
        }

        this.socket.to(body.userId).emit("newMessage", message);

        return _ack?.({
          success: RES.SUCCESS.code,
          errormessage: RES.SUCCESS.message,
          response: message,
        });
      }
    } catch (err) {
      console.error(`Failed to update`);
    }
  }

  private async chat(
  body: { channelId?: string; type: number; userId?: string },
  _ack?: Function
) {
  try {
    if(!body.type) return _ack?.({
          success: RES.CLIENT_ERROR.code,
          errormessage: RES.CLIENT_ERROR.message,
        });

    let conversation;

    if (body.type == EChatType.group && body.channelId) {
      const channelId = M.mongify(body.channelId);
      const channel = await Channel.findById(channelId).lean();
      conversation = await Conversation.findOne({ channelId: channel?._id }).lean();
    } else if (body.type == EChatType.personal && body.userId) {
      const senderId = M.mongify(this.userId);
      const receiverId = M.mongify(body.userId);

      conversation = await Conversation.findOne({
        chatType: EChatType.personal,
        users: { $all: [senderId, receiverId], $size: 2 },
      }).lean();
    } else {
      return _ack?.({
        success: RES.CLIENT_ERROR.code,
        errormessage: "chatId or userId required",
      });
    }

    if (!conversation) {
      return _ack?.({
        success: RES.SUCCESS.code,
        errormessage: RES.SUCCESS.message,
        response: [],
      });
    }

    const messages = await Message.find(
      { _id: { $in: conversation.message } },
      { senderId: 1, message: 1, readBy: 1, createdAt: 1 }
    ).lean();

    const userIds = messages.map((msg) => msg.senderId);
    const users = await User.find({ _id: { $in: userIds } }, { name: 1 }).lean();

    const messagesWithUserNames = messages.map((msg) => {
      const user = users.find((u) => u._id.toString() === msg.senderId.toString());
      return {
        _id: msg._id,
        message: msg.message,
        senderName: user ? user.name : "Unknown",
        readBy: msg.readBy,
        createdAt: msg.dCreatedAt,
      };
    });

    return _ack?.({
      success: RES.SUCCESS.code,
      errormessage: RES.SUCCESS.message,
      response: messagesWithUserNames,
    });
  } catch (err) {
    console.error("Failed to fetch chat:", err);
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

}
