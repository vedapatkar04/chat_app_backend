import { Server, Socket } from "socket.io";
import { rootSocket } from "../rootSocket";

export const initSocket = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    const { userId, authToken } = socket.handshake.query;

    if (!userId) {
      return next(new Error("Unauthorized"));
    }

    socket.data.userId = userId;
    socket.data.authToken = authToken;
    next();
  });

  io.on("connection", (socket: Socket) => new rootSocket(socket));
};
