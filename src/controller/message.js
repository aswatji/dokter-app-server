const { successResponse, errorResponse } = require("../utils/response");
const prisma = require("../config/database");
const { validationResult } = require("express-validator");

// Kirim pesan
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const {
      consultationId,
      content,
      messageType = "TEXT",
      fileUrl,
      fileName,
    } = req.body;
    const senderId = req.user.id;

    // Cek apakah konsultasi ada dan user terlibat dalam konsultasi
    const consultation = await prisma.consultation.findFirst({
      where: {
        id: consultationId,
        OR: [{ patientId: senderId }, { doctorId: senderId }],
      },
      include: {
        payment: true,
      },
    });

    if (!consultation) {
      return errorResponse(res, "Consultation not found", 404);
    }

    // Cek apakah konsultasi aktif
    if (consultation.status !== "ACTIVE") {
      return errorResponse(res, "Consultation is not active", 400);
    }

    // Cek apakah pembayaran sudah dilakukan (jika diperlukan)
    if (!consultation.payment || consultation.payment.status !== "PAID") {
      return errorResponse(
        res,
        "Payment required before sending messages",
        400
      );
    }

    // Buat pesan baru
    const message = await prisma.message.create({
      data: {
        consultationId,
        senderId,
        content,
        messageType,
        fileUrl,
        fileName,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullname: true,
            photo: true,
            role: true,
          },
        },
      },
    });

    // Emit real-time message via Socket.IO (akan ditambahkan nanti)
    // io.to(consultationId).emit('newMessage', message);

    return successResponse(res, message, "Message sent successfully", 201);
  } catch (error) {
    console.error("Send message error:", error);
    return errorResponse(res, "Failed to send message", 500);
  }
};

// Get pesan dari konsultasi
const getMessages = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    // Cek apakah user terlibat dalam konsultasi
    const consultation = await prisma.consultation.findFirst({
      where: {
        id: consultationId,
        OR: [{ patientId: userId }, { doctorId: userId }],
      },
    });

    if (!consultation) {
      return errorResponse(res, "Consultation not found", 404);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await prisma.message.findMany({
      where: {
        consultationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullname: true,
            photo: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: parseInt(limit),
    });

    // Mark messages as read untuk user yang request
    await prisma.message.updateMany({
      where: {
        consultationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    const totalCount = await prisma.message.count({
      where: { consultationId },
    });

    return successResponse(
      res,
      {
        messages: messages.reverse(), // Reverse agar yang terbaru di bawah
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
      "Messages retrieved successfully"
    );
  } catch (error) {
    console.error("Get messages error:", error);
    return errorResponse(res, "Failed to get messages", 500);
  }
};

// Get unread messages count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get semua konsultasi user
    const consultations = await prisma.consultation.findMany({
      where: {
        OR: [{ patientId: userId }, { doctorId: userId }],
      },
      select: {
        id: true,
      },
    });

    const consultationIds = consultations.map((c) => c.id);

    // Count unread messages
    const unreadCount = await prisma.message.count({
      where: {
        consultationId: { in: consultationIds },
        senderId: { not: userId },
        isRead: false,
      },
    });

    return successResponse(
      res,
      { unreadCount },
      "Unread count retrieved successfully"
    );
  } catch (error) {
    console.error("Get unread count error:", error);
    return errorResponse(res, "Failed to get unread count", 500);
  }
};

// Mark messages as read
const markAsRead = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const userId = req.user.id;

    // Cek apakah user terlibat dalam konsultasi
    const consultation = await prisma.consultation.findFirst({
      where: {
        id: consultationId,
        OR: [{ patientId: userId }, { doctorId: userId }],
      },
    });

    if (!consultation) {
      return errorResponse(res, "Consultation not found", 404);
    }

    // Mark semua pesan sebagai read
    await prisma.message.updateMany({
      where: {
        consultationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return successResponse(res, null, "Messages marked as read");
  } catch (error) {
    console.error("Mark as read error:", error);
    return errorResponse(res, "Failed to mark messages as read", 500);
  }
};

// Delete message (hanya pengirim yang bisa delete)
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findFirst({
      where: {
        id,
        senderId: userId,
      },
    });

    if (!message) {
      return errorResponse(res, "Message not found", 404);
    }

    await prisma.message.delete({
      where: { id },
    });

    return successResponse(res, null, "Message deleted successfully");
  } catch (error) {
    console.error("Delete message error:", error);
    return errorResponse(res, "Failed to delete message", 500);
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getUnreadCount,
  markAsRead,
  deleteMessage,
};
