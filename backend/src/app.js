import express from "express";
import { createServer } from "http";
import cors from "cors";
import mongoose from "mongoose";
import { connectToSocket } from "./Controllers/socketManager.js";

const app = express();
const server = createServer(app);

app.use(cors({
  origin: "https://sky-video-call-frontend.onrender.com",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});

connectToSocket(server);

mongoose.connect(
  "mongodb+srv://shifashaikh455:sRFfn8pQegK4y9lM@zoom-clone-cluster.wn91exf.mongodb.net/",
).then(() => {
  server.listen(8000, () => {
    console.log("Server running on 8000");
  });
});





// backend/src/server.js
// import express from "express";
// import { createServer } from "node:http";
// import mongoose from "mongoose";
// import cors from "cors";

// import { connectToSocket } from "./Controllers/socketManager.js";
// import userRoutes from "./Routes/users.route.js";

// const app = express();
// const server = createServer(app);

// // Middleware
// app.use(
//   cors({
//     origin: "https://sky-video-call-frontend.onrender.com", // your frontend URL
//     methods: ["GET", "POST"],
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: "40kb" }));
// app.use(express.urlencoded({ limit: "40kb", extended: true }));

// // Routes
// app.get("/", (req, res) => res.send("Sky Video Call Backend is running"));
// app.get("/health", (req, res) =>
//   res.status(200).json({ status: "OK", timestamp: new Date() })
// );

// app.use("/api/v1/users", userRoutes);

// // Socket.io
// const io = connectToSocket(server);

// // Start server + connect DB
// const start = async () => {
//   try {
//     const connectionDb = await mongoose.connect(
//       "mongodb+srv://shifashaikh455:sRFfn8pQegK4y9lM@zoom-clone-cluster.wn91exf.mongodb.net/",
//       {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//       }
//     );

//     console.log(`MongoDB Connected: ${connectionDb.connection.host}`);

//     server.listen(process.env.PORT || 8000, () => {
//       console.log(`Server listening on port ${process.env.PORT || 8000}`);
//     });
//   } catch (err) {
//     console.error("Error connecting to MongoDB:", err.message);
//     process.exit(1);
//   }
// };

// start();
