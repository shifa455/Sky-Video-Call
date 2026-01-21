import { Server } from "socket.io"


let connections = {}
let messages = {}
let timeOnline = {}

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });


    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        socket.on("join-call", (path) => {

            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id)

            timeOnline[socket.id] = new Date();

            // connections[path].forEach(elem => {
            //     io.to(elem)
            // })

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }

        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {

            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {


                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }

                    return [room, isFound];

                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }

        })

        socket.on("disconnect", () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)


                        if (connections[key].length === 0) {
                            delete connections[key]
                        }
                    }
                }

            }


        })


    })


    return io;
}


// // backend/src/Controllers/socketManager.js
// import { Server } from "socket.io";

// let connections = {};
// let messages = {};
// let timeOnline = {};

// export const connectToSocket = (server) => {
//   const io = new Server(server, {
//     cors: {
//       origin: [
//         "https://sky-video-call-frontend.onrender.com", // your frontend
//       ],
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//   });

//   io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);

//     // Join call
//     socket.on("join-call", (roomId) => {
//       if (!connections[roomId]) connections[roomId] = [];
//       connections[roomId].push(socket.id);
//       timeOnline[socket.id] = new Date();

//       // Notify everyone in the room about the new user
//       connections[roomId].forEach((id) => {
//         io.to(id).emit("user-joined", socket.id, connections[roomId]);
//       });

//       // Send previous messages to the newly joined user
//       if (messages[roomId]) {
//         messages[roomId].forEach((msg) => {
//           io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg.socketId);
//         });
//       }
//     });

//     // WebRTC signaling
//     socket.on("signal", (toId, message) => {
//       io.to(toId).emit("signal", socket.id, message);
//     });

//     // Chat messages
//     socket.on("chat-message", (data, sender) => {
//       let roomId = null;
//       for (const [key, users] of Object.entries(connections)) {
//         if (users.includes(socket.id)) {
//           roomId = key;
//           break;
//         }
//       }
//       if (!roomId) return;

//       if (!messages[roomId]) messages[roomId] = [];
//       messages[roomId].push({ data, sender, socketId: socket.id });

//       connections[roomId].forEach((id) => {
//         io.to(id).emit("chat-message", data, sender, socket.id);
//       });
//     });

//     // Disconnect
//     socket.on("disconnect", () => {
//       console.log("User disconnected:", socket.id);
//       delete timeOnline[socket.id];

//       for (const [roomId, users] of Object.entries(connections)) {
//         if (users.includes(socket.id)) {
//           connections[roomId] = users.filter((id) => id !== socket.id);
//           connections[roomId].forEach((id) => io.to(id).emit("user-left", socket.id));

//           if (connections[roomId].length === 0) {
//             delete connections[roomId];
//             delete messages[roomId];
//           }
//         }
//       }
//     });
//   });

//   return io;
// };
