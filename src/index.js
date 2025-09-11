require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createServer } = require("http");
const path = require("path");

const { initSocketIO } = require("./config/socket");
const middlewareLogRequest = require("./middleware/logs");
const { handleUploadError } = require("./middleware/upload");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const consultationRoutes = require("./routes/consultation");
const paymentRoutes = require("./routes/payment");
const messageRoutes = require("./routes/message");
const uploadRoutes = require("./routes/upload");

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 4000;

// Initialize Socket.IO
const io = initSocketIO(server);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// CORS - Updated untuk Real Device Support
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000", // React web development
      "http://localhost:19006", // Expo web
      "http://localhost:8081", // React Native Metro
      `http://${process.env.NETWORK_IP}:19000`, // Expo dev server
      `exp://${process.env.NETWORK_IP}:19000`, // Expo development
      "exp://localhost:19000", // Expo development
    ];

    // Allow all origins for development (Real Device support)
    if (process.env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(null, allowedOrigins.indexOf(origin) !== -1);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files untuk uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Request logging
app.use(middlewareLogRequest);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);

// Upload error handler
app.use(handleUploadError);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Doctor Consultation API Server",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      consultations: "/api/consultations",
      payments: "/api/payments",
      messages: "/api/messages",
      health: "/api/health",
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const networkIP = process.env.NETWORK_IP || "192.168.8.194";
  console.log(`🚀 Server berhasil running di port ${PORT}`);
  console.log(`� Laptop: http://localhost:${PORT}/api/health`);
  console.log(`📱 Real Device: http://${networkIP}:${PORT}/api/health`);
  console.log(`🏥 Doctor Consultation API: http://${networkIP}:${PORT}`);
  console.log(`⚡ Socket.IO: Enabled`);
  console.log(`🌐 Network IP: ${networkIP}`);
});
