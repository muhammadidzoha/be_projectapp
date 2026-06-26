import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

const prisma = new PrismaClient();

export const createNotification = async (userId, title, message, type, referenceId = null) => {
  return prisma.notification.create({
    data: { userId, title, message, type, referenceId },
  });
};

export const getNotifications = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const skip = limit * page;

    const [notifications, totalRows] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId: user.id } }),
    ]);

    const totalPages = Math.ceil(totalRows / limit);

    return successResponse(res, {
      notifications,
      page,
      limit,
      totalPages,
      totalRows,
    }, "Notifications fetched");
  } catch (err) {
    return errorResponse(res, err, "Failed to get notifications");
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const user = req.user;
    const count = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return successResponse(res, { count }, "Unread count fetched");
  } catch (err) {
    return errorResponse(res, err, "Failed to get unread count");
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });

    return successResponse(res, null, "Notification marked as read");
  } catch (err) {
    return errorResponse(res, err, "Failed to mark notification as read");
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const user = req.user;

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return successResponse(res, null, "All notifications marked as read");
  } catch (err) {
    return errorResponse(res, err, "Failed to mark all as read");
  }
};
