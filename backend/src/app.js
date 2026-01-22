// backend/src/app.js
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import { connectToSocket } from "./Controllers/socketManager.js";
import userRoutes from "./Routes/users.route.js";

const app = express();
const server = createServer(app);

// ----------------- MIDDLEWARE -----------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------- ROUTES -----------------
app.use("/api/users", userRoutes);

app.get("/", (req, res) => res.send("Sky Video Call Backend Running"));

// ----------------- SOCKET.IO -----------------
connectToSocket(server);

// ----------------- START SERVER + MONGO -----------------
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected ✅");

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));
  } catch (err) {
    console.error("Error starting server:", err.message);
    process.exit(1);
  }
};

startServer();
