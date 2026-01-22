import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { connectToSocket } from "./Controllers/socketManager.js";
import userRoutes from "./Routes/users.route.js";

const app = express();
const server = createServer(app);

// Middleware
app.use(
  cors({
    origin: "https://sky-video-call-frontend.onrender.com",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Routes
app.get("/", (req, res) => res.send("Sky Video Call Backend is running"));
app.get("/health", (req, res) =>
  res.status(200).json({ status: "OK", timestamp: new Date() })
);

app.use("/api/v1/users", userRoutes);

// Socket.io
connectToSocket(server);

// MongoDB connection + offline fallback
const start = async () => {
  let mongoConnected = false;

  try {
    const connectionDb = await mongoose.connect(
      "mongodb+srv://shifashaikh455:sRFfn8pQegK4y9lM@zoom-clone-cluster.wn91exf.mongodb.net/skyVideoCall",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    mongoConnected = true;
    console.log(`MongoDB Connected: ${connectionDb.connection.host}`);
  } catch (err) {
    console.error("MongoDB offline, using memory storage:", err.message);
  }

  const PORT = process.env.PORT || 8000;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(mongoConnected ? "MongoDB Online" : "MongoDB Offline - using memory storage");
  });
};

start();
