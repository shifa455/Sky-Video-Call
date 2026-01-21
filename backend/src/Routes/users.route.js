import { Router } from "express";
import { addToHistory, getUserHistory, login, register } from "../Controllers/user.controller.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/add_to_activity", addToHistory);
router.get("/get_all_activity", getUserHistory);

export default router;
