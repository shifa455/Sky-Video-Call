// backend/src/server.js
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import { connectToSocket } from "./Controllers/socketManager.js";
import userRoutes from "./Routes/users.route.js";
import meetingRoutes from "./Routes/meetings.route.js";

const app = express();
const server = createServer(app);

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/", (req, res) => res.send("Video Call Backend Running"));

// Socket
connectToSocket(server);

// Start server + MongoDB
const start = async () => {
  try {
    await mongoose.connect("YOUR_MONGO_URI", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
