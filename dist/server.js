"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const socket_1 = require("./config/socket");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const server = http_1.default.createServer(app_1.default);
const startServer = async () => {
    try {
        await (0, db_1.connectDB)();
        (0, socket_1.initSocket)(server);
        server.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("❌ Server failed to start", error);
        process.exit(1);
    }
};
startServer();
