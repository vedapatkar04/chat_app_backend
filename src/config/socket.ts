import { Server, Socket } from "socket.io";
import { rootSocket } from "../rootSocket";

export const initSocket = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: {
      // origin: "https://chatapp-project-red.vercel.app", // prod frontend
      // credentials: true,
      
      // origin: "http://localhost:5173", // frontend
      // credentials: true,
     
     origin: "*" , // all
     credentials: true,
    }
  });

  io.use((socket, next) => {
    const { userId, authToken } = socket.handshake.query;

    if (!userId || !authToken) {
      return next(new Error("Unauthorized"));
    }

    socket.data.userId = userId;
    socket.data.authToken = authToken;
    next();
  });

  io.on("connection", (socket: Socket) => new rootSocket(socket));
};
