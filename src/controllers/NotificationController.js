import { randomUUID } from "node:crypto";
import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

export const createNotification = async (
  userId,
  title,
  message,
  type,
  referenceId = null,
) => {
  const id = randomUUID();
  await pool.query(
    "INSERT INTO notifications (id, userId, title, message, isRead, type, referenceId, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?, NOW())",
    [id, userId, title, message, type, referenceId],
  );
  return {
    id,
    userId,
    title,
    message,
    isRead: 0,
    type,
    referenceId,
  };
};

export const getNotifications = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const skip = limit * page;

    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM notifications WHERE userId = ?",
      [user.id],
    );
    const totalRows = countRow.total;

    const [notifications] = await pool.query(
      "SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?",
      [user.id, limit, skip],
    );

    const totalPages = Math.ceil(totalRows / limit);

    return successResponse(
      res,
      { notifications, page, limit, totalPages, totalRows },
      "Notifications fetched",
    );
  } catch (err) {
    return errorResponse(res, err, "Failed to get notifications");
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const user = req.user;
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM notifications WHERE userId = ? AND isRead = 0",
      [user.id],
    );
    const count = countRow.total;

    return successResponse(res, { count }, "Unread count fetched");
  } catch (err) {
    return errorResponse(res, err, "Failed to get unread count");
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await pool.query(
      "UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?",
      [id, user.id],
    );

    return successResponse(res, null, "Notification marked as read");
  } catch (err) {
    return errorResponse(res, err, "Failed to mark notification as read");
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const user = req.user;

    await pool.query(
      "UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0",
      [user.id],
    );

    return successResponse(res, null, "All notifications marked as read");
  } catch (err) {
    return errorResponse(res, err, "Failed to mark all as read");
  }
};
