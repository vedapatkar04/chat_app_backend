"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const rootSocket_1 = require("../rootSocket");
const initSocket = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            // origin: "https://chatapp-project-red.vercel.app", // prod frontend
            // credentials: true,
            // origin: "http://localhost:5173", // frontend
            // credentials: true,
            origin: "*", // all
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
    io.on("connection", (socket) => new rootSocket_1.rootSocket(socket));
};
exports.initSocket = initSocket;
