// backend/src/Controllers/user.controller.js
import httpStatus from "http-status";
import { User } from "../Models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../Models/meeting.model.js";

/**
 * Login Controller
 * Validates credentials, generates a session token, and returns it.
 */
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Username and password are required" });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.token = token;
    await user.save();

    return res.status(httpStatus.OK).json({ token });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong" });
  }
};

/**
 * Register Controller
 * Creates a new user with hashed password.
 */
const register = async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(httpStatus.CONFLICT).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, username, password: hashedPassword });
    await newUser.save();

    return res.status(httpStatus.CREATED).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong" });
  }
};

/**
 * Get User History
 * Retrieves all meetings linked to the authenticated user.
 */
const getUserHistory = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Token is required" });
  }

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });
    }

    const meetings = await Meeting.find({ user_id: user.username });
    return res.status(httpStatus.OK).json(meetings);
  } catch (error) {
    console.error("Get history error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong" });
  }
};

/**
 * Add to History
 * Saves a new meeting record for the authenticated user.
 */
const addToHistory = async (req, res) => {
  const { token, meeting_code } = req.body;
  if (!token || !meeting_code) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Token and meeting code are required" });
  }

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });
    }

    const newMeeting = new Meeting({ user_id: user.username, meetingCode: meeting_code });
    await newMeeting.save();

    return res.status(httpStatus.CREATED).json({ message: "Meeting added to history" });
  } catch (error) {
    console.error("Add history error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${error.message}` });
  }
};

export { login, register, getUserHistory, addToHistory };