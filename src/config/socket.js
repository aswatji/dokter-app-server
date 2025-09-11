const { Server } = require("socket.io");
const { verifyToken } = require("../utils/auth");
const prisma = require("../config/database");

let io;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware untuk autentikasi Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = verifyToken(token);

      // Cek user di database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          fullname: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        return next(new Error("User not found or inactive"));
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.fullname} (${socket.userId})`);

    // Join user ke consultations mereka
    socket.on("join-consultations", async () => {
      try {
        const consultations = await prisma.consultation.findMany({
          where: {
            OR: [{ patientId: socket.userId }, { doctorId: socket.userId }],
          },
          select: { id: true },
        });

        consultations.forEach((consultation) => {
          socket.join(consultation.id);
        });

        console.log(
          `User ${socket.userId} joined ${consultations.length} consultation rooms`
        );
      } catch (error) {
        console.error("Error joining consultations:", error);
      }
    });

    // Join specific consultation room
    socket.on("join-consultation", async (consultationId) => {
      try {
        // Verify user is part of this consultation
        const consultation = await prisma.consultation.findFirst({
          where: {
            id: consultationId,
            OR: [{ patientId: socket.userId }, { doctorId: socket.userId }],
          },
        });

        if (consultation) {
          socket.join(consultationId);
          console.log(
            `User ${socket.userId} joined consultation ${consultationId}`
          );
        }
      } catch (error) {
        console.error("Error joining consultation:", error);
      }
    });

    // Leave consultation room
    socket.on("leave-consultation", (consultationId) => {
      socket.leave(consultationId);
      console.log(`User ${socket.userId} left consultation ${consultationId}`);
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      socket.to(data.consultationId).emit("user-typing", {
        userId: socket.userId,
        userName: socket.user.fullname,
        isTyping: data.isTyping,
      });
    });

    // Handle real-time message (will be emitted from message controller)
    socket.on("send-message", async (data) => {
      try {
        // Verify consultation access
        const consultation = await prisma.consultation.findFirst({
          where: {
            id: data.consultationId,
            OR: [{ patientId: socket.userId }, { doctorId: socket.userId }],
          },
        });

        if (consultation) {
          // Emit to all users in consultation room
          io.to(data.consultationId).emit("new-message", {
            ...data,
            senderId: socket.userId,
            senderName: socket.user.fullname,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    });

    // Handle consultation status updates
    socket.on("consultation-status-changed", (data) => {
      socket.to(data.consultationId).emit("consultation-status-updated", data);
    });

    socket.on("disconnect", () => {
      console.log(
        `User disconnected: ${socket.user.fullname} (${socket.userId})`
      );
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized!");
  }
  return io;
};

// Emit message to consultation room
const emitToConsultation = (consultationId, event, data) => {
  if (io) {
    io.to(consultationId).emit(event, data);
  }
};

// Emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(userId).emit(event, data);
  }
};

module.exports = {
  initSocketIO,
  getIO,
  emitToConsultation,
  emitToUser,
};
