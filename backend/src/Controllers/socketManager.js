import { Server } from "socket.io";

let connections = {};
let messages = {};

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

    // Join call
    socket.on("join-call", (roomId) => {
      if (!connections[roomId]) connections[roomId] = [];
      connections[roomId].push(socket.id);

      const otherUsers = connections[roomId].filter(id => id !== socket.id);

      // Notify the new user about existing users
      socket.emit("user-joined", otherUsers);

      // Notify existing users about the new user
      socket.to(roomId).emit("user-joined", [socket.id]);

      // Send previous chat messages to new user
      if (messages[roomId]) {
        messages[roomId].forEach((msg) => {
          socket.emit("chat-message", msg.data, msg.sender, msg.socketId);
        });
      }
    });

    // WebRTC signaling
    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    // Chat messages
    socket.on("chat-message", (data, sender) => {
      const roomId = Object.keys(connections).find(r => connections[r].includes(socket.id));
      if (!roomId) return;

      if (!messages[roomId]) messages[roomId] = [];
      messages[roomId].push({ data, sender, socketId: socket.id });

      connections[roomId].forEach((id) => {
        io.to(id).emit("chat-message", data, sender, socket.id);
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      for (const [roomId, users] of Object.entries(connections)) {
        if (users.includes(socket.id)) {
          connections[roomId] = users.filter((id) => id !== socket.id);
          connections[roomId].forEach((id) => io.to(id).emit("user-left", socket.id));

          if (connections[roomId].length === 0) {
            delete connections[roomId];
            delete messages[roomId];
          }
        }
      }
    });
  });

  return io;
};
