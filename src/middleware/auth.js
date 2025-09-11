const { verifyToken } = require("../utils/auth");
const { errorResponse } = require("../utils/response");
const prisma = require("../config/database");

// Middleware untuk autentikasi
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return errorResponse(res, "Access token is required", 401);
    }

    const decoded = verifyToken(token);

    // Cek apakah user masih aktif
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return errorResponse(res, "User not found or inactive", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Token has expired", 401);
    } else if (error.name === "JsonWebTokenError") {
      return errorResponse(res, "Invalid token", 401);
    }
    return errorResponse(res, "Authentication failed", 401);
  }
};

// Middleware untuk autorisasi berdasarkan role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Authentication required", 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, "Insufficient permissions", 403);
    }

    next();
  };
};

// Middleware untuk cek apakah user adalah dokter
const requireDoctor = authorizeRoles("DOCTOR", "ADMIN");

// Middleware untuk cek apakah user adalah pasien
const requirePatient = authorizeRoles("PATIENT", "ADMIN");

// Middleware untuk cek apakah user adalah admin
const requireAdmin = authorizeRoles("ADMIN");

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireDoctor,
  requirePatient,
  requireAdmin,
};
