import { Socket } from "socket.io";
import { User } from "../src/models";
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

    
    if (!this.socket.eventNames().includes("disconnect")) {
      this.socket.on("disconnect", this.disconnect.bind(this));
    }

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
}
