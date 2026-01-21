import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
});

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    token: localStorage.getItem("token") || null,
  });
  const router = useNavigate();

  // Register user
  const handleRegister = async (name, username, password) => {
    try {
      const response = await client.post("/register", { name, username, password });
      if (response.status === httpStatus.CREATED) return response.data.message;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Registration failed");
    }
  };

  // Login user
  const handleLogin = async (username, password) => {
    try {
      const response = await client.post("/login", { username, password });
      if (response.status === httpStatus.OK) {
        localStorage.setItem("token", response.data.token);
        setUserData({ token: response.data.token });
        router("/home");
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || "Login failed");
    }
  };

  // Get user meeting history
  const getHistoryOfUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await client.get("/get_all_activity", { params: { token } });
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Failed to fetch history");
    }
  };

  // Add meeting to history
  const addToUserHistory = async (meetingCode) => {
    try {
      if (!meetingCode.trim()) throw new Error("Meeting code is required");
      const token = localStorage.getItem("token");
      const response = await client.post("/add_to_activity", { token, meeting_code: meetingCode });
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Failed to add to history");
    }
  };

  const data = {
    userData,
    setUserData,
    handleRegister,
    handleLogin,
    getHistoryOfUser,
    addToUserHistory,
  };

  return <AuthContext.Provider value={data}>{children}</AuthContext.Provider>;
};
