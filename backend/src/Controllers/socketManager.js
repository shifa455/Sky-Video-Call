import { Server } from "socket.io";
import mongoose from "mongoose";

// In-memory storage
let connections = {};
let messagesMemory = {};

const ChatSchema = new mongoose.Schema({
  roomId: String,
  sender: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});
const ChatModel = mongoose.models.Chat || mongoose.model("Chat", ChatSchema);

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["https://sky-video-call-frontend.onrender.com"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-call", async (roomId) => {
      if (!connections[roomId]) connections[roomId] = [];
      connections[roomId].push(socket.id);

      const otherUsers = connections[roomId].filter(id => id !== socket.id);
      socket.emit("user-joined", otherUsers);
      socket.to(roomId).emit("user-joined", [socket.id]);

      // Load previous messages from MongoDB or memory
      try {
        const dbMessages = await ChatModel.find({ roomId }).sort({ createdAt: 1 }).lean();
        dbMessages.forEach(msg => socket.emit("chat-message", msg.message, msg.sender, null));
      } catch {
        if (messagesMemory[roomId]) {
          messagesMemory[roomId].forEach(msg => socket.emit("chat-message", msg.data, msg.sender, null));
        }
      }
    });

    socket.on("signal", (toId, data) => io.to(toId).emit("signal", socket.id, data));

    socket.on("chat-message", async (data, sender) => {
      const roomId = Object.keys(connections).find(r => connections[r].includes(socket.id));
      if (!roomId) return;

      // Store in memory
      if (!messagesMemory[roomId]) messagesMemory[roomId] = [];
      messagesMemory[roomId].push({ data, sender });

      // Store in MongoDB (if online)
      try {
        await ChatModel.create({ roomId, sender, message: data });
      } catch {
        console.log("MongoDB offline, stored message in memory only");
      }

      // Broadcast
      connections[roomId].forEach(id => io.to(id).emit("chat-message", data, sender, socket.id));
    });

    socket.on("disconnect", () => {
      for (const [roomId, users] of Object.entries(connections)) {
        if (users.includes(socket.id)) {
          connections[roomId] = users.filter(id => id !== socket.id);
          connections[roomId].forEach(id => io.to(id).emit("user-left", socket.id));
          if (connections[roomId].length === 0) {
            delete connections[roomId];
            delete messagesMemory[roomId];
          }
        }
      }
    });
  });

  return io;
};
