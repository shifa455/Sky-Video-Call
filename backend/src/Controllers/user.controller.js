// backend/src/Controllers/user.controller.js
import httpStatus from "http-status";
import { User } from "../Models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../Models/meeting.model.js";

// Login Controller
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password" });

    const token = crypto.randomBytes(20).toString("hex");
    user.token = token;
    await user.save();

    return res.status(httpStatus.OK).json({ token });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Register Controller
const register = async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(409).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, password: hashedPassword });
    await newUser.save();

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get User History
const getUserHistory = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: "Token is required" });

  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(401).json({ message: "Invalid token" });

    const meetings = await Meeting.find({ user_id: user.username });
    return res.status(200).json(meetings);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Add to History
const addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;
  if (!token || !meeting_code) return res.status(400).json({ message: "Token and meeting code are required" });

  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(401).json({ message: "Invalid token" });

    const newMeeting = new Meeting({ user_id: user.username, meetingCode: meeting_code });
    await newMeeting.save();

    return res.status(201).json({ message: "Meeting added to history" });
  } catch (error) {
    return res.status(500).json({ message: `Something went wrong: ${error.message}` });
  }
};

export { login, register, getUserHistory, addToHistory };
