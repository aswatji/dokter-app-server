const {
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");
const { successResponse, errorResponse } = require("../utils/response");
const prisma = require("../config/database");
const { validationResult } = require("express-validator");

// Register user baru
const register = async (req, res) => {
  try {
    // Cek validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { email, password, fullname, phone, role = "PATIENT" } = req.body;

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse(res, "Email already registered", 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Buat user baru
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullname,
        phone,
        role,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken({ userId: newUser.id, role: newUser.role });

    return successResponse(
      res,
      {
        user: newUser,
        token,
      },
      "User registered successfully",
      201
    );
  } catch (error) {
    console.error("Register error:", error);
    return errorResponse(res, "Registration failed", 500);
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Cek validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { email, password } = req.body;

    // Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        doctorProfile: true,
      },
    });

    if (!user) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    // Cek apakah user aktif
    if (!user.isActive) {
      return errorResponse(res, "Account is deactivated", 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    // Generate token
    const token = generateToken({ userId: user.id, role: user.role });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(
      res,
      {
        user: userWithoutPassword,
        token,
      },
      "Login successful"
    );
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, "Login failed", 500);
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        doctorProfile: true,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        phone: true,
        photo: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        doctorProfile: true,
      },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, user, "Profile retrieved successfully");
  } catch (error) {
    console.error("Get profile error:", error);
    return errorResponse(res, "Failed to get profile", 500);
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    // Cek validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { fullname, phone, photo } = req.body;
    const userId = req.user.id;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullname,
        phone,
        photo,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        phone: true,
        photo: true,
        role: true,
        updatedAt: true,
      },
    });

    return successResponse(res, updatedUser, "Profile updated successfully");
  } catch (error) {
    console.error("Update profile error:", error);
    return errorResponse(res, "Failed to update profile", 500);
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    // Cek validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user dengan password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return errorResponse(res, "Current password is incorrect", 400);
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return successResponse(res, null, "Password changed successfully");
  } catch (error) {
    console.error("Change password error:", error);
    return errorResponse(res, "Failed to change password", 500);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
};
