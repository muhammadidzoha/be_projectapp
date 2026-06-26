import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/NotificationController.js";
import { verifyToken } from "../middelware/verifyToken.js";

const router = Router();

router.get("/notifications", verifyToken, getNotifications);
router.get("/notifications/unread-count", verifyToken, getUnreadCount);
router.patch("/notifications/:id/read", verifyToken, markAsRead);
router.patch("/notifications/read-all", verifyToken, markAllAsRead);

export default router;
