import express from "express";
import cors from "cors";
import authRoutes from "./routes/routes";

const app = express();

app.use(
  cors({
    // origin: "*", // postman
    // origin: "http://localhost:5173", // frontend
    origin: "https://chatapp-project-red.vercel.app", // prod frontend
  })
);
app.use(express.json());

app.use("/user", authRoutes);

export default app;
