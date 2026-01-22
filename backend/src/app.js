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
    origin: "https://sky-video-call-frontend.onrender.com", // your frontend URL
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
    // <-- Hardcode your MongoDB URI here -->
    const mongoURI =
      "mongodb+srv://shifa423:sRFfn8pQegK4y9lM@zoom-clone-cluster.wn91exf.mongodb.net/video_call_db?retryWrites=true&w=majority";

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected ");

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT} `));
  } catch (err) {
    console.error("Error starting server:", err.message);
    process.exit(1);
  }
};

startServer();
