// backend/src/Controllers/socketManager.js
import { Server } from "socket.io";

let connections = {}; // roomId => [socketIds]
let messages = {};    // roomId => [{data, sender, id}]

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: ["http://localhost:3000"], methods: ["GET","POST"], credentials:true }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Join a meeting room
    socket.on("join-meeting", (roomId) => {
      if (!connections[roomId]) connections[roomId] = [];
      connections[roomId].push(socket.id);

      // Notify all users in room
      connections[roomId].forEach(id =>
        io.to(id).emit("user-joined", socket.id, connections[roomId])
      );

      // Send previous chat messages
      if (messages[roomId]) {
        messages[roomId].forEach(m =>
          socket.emit("chat-message", m.data, m.sender, m.id)
        );
      }
    });

    // WebRTC signaling
    socket.on("signal", (toId, data) => {
      io.to(toId).emit("signal", socket.id, data);
    });

    // Chat message
    socket.on("chat-message", (data, sender) => {
      const roomId = Object.keys(connections).find(r => connections[r].includes(socket.id));
      if (!roomId) return;

      if (!messages[roomId]) messages[roomId] = [];
      messages[roomId].push({ data, sender, id: socket.id });

      connections[roomId].forEach(id =>
        io.to(id).emit("chat-message", data, sender, socket.id)
      );
    });

    // Disconnect
    socket.on("disconnect", () => {
      for (const roomId in connections) {
        connections[roomId] = connections[roomId].filter(id => id !== socket.id);
        io.emit("user-left", socket.id);
        if (connections[roomId].length === 0) delete messages[roomId];
      }
    });
  });
};
