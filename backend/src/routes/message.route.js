import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:userId", protectRoute, getMessages); // Changed from /:id to /:userId
router.post("/send/:userId", protectRoute, sendMessage); // Changed to match getMessages

export default router;