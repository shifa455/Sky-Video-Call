// backend/src/server.js
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { connectToSocket } from "./Controllers/socketManager.js";
import userRoutes from "./Routes/users.route.js";

const app = express();
const server = createServer(app);

// ------------------ MIDDLEWARE ------------------
app.use(
  cors({
    origin: "https://sky-video-call-frontend.onrender.com", // frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// ------------------ ROUTES ------------------
app.get("/", (req, res) => res.send("Sky Video Call Backend is running"));

app.get("/health", (req, res) =>
  res.status(200).json({ status: "OK", timestamp: new Date() })
);

app.use("/api/v1/users", userRoutes);

// ------------------ SOCKET.IO ------------------
const io = connectToSocket(server);

// ------------------ START SERVER + CONNECT DB ------------------
const sta
