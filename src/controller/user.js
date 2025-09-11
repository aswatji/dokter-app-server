const { successResponse, errorResponse } = require("../utils/response");
const { hashPassword } = require("../utils/auth");
const prisma = require("../config/database");
const { validationResult } = require("express-validator");

// Get all users (untuk admin)
const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search } = req.query;

    const whereClause = {};

    if (role) {
      whereClause.role = role;
    }

    if (search) {
      whereClause.OR = [
        { fullname: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await prisma.user.findMany({
      where: whereClause,
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
      skip,
      take: parseInt(limit),
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalCount = await prisma.user.count({
      where: whereClause,
    });

    return successResponse(
      res,
      {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
      "Users retrieved successfully"
    );
  } catch (error) {
    console.error("Get all users error:", error);
    return errorResponse(res, "Failed to get users", 500);
  }
};

// Create new user (untuk admin)
const createNewUser = async (req, res) => {
  try {
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

    return successResponse(res, newUser, "User created successfully", 201);
  } catch (error) {
    console.error("Create user error:", error);
    return errorResponse(res, "Failed to create user", 500);
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
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

    return successResponse(res, user, "User retrieved successfully");
  } catch (error) {
    console.error("Get user by ID error:", error);
    return errorResponse(res, "Failed to get user", 500);
  }
};

// Update user (untuk admin)
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { fullname, phone, photo, isActive } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        fullname,
        phone,
        photo,
        isActive,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        phone: true,
        photo: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return successResponse(res, updatedUser, "User updated successfully");
  } catch (error) {
    console.error("Update user error:", error);
    return errorResponse(res, "Failed to update user", 500);
  }
};

// Delete user (untuk admin) - soft delete
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Soft delete - set isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(res, null, "User deleted successfully");
  } catch (error) {
    console.error("Delete user error:", error);
    return errorResponse(res, "Failed to delete user", 500);
  }
};

// Create doctor profile
const createDoctorProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { userId } = req.params;
    const {
      specialization,
      licenseNumber,
      experience,
      education,
      consultationFee,
      bio,
    } = req.body;

    // Cek apakah user ada dan rolenya doctor
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        role: "DOCTOR",
      },
      include: {
        doctorProfile: true,
      },
    });

    if (!user) {
      return errorResponse(res, "Doctor not found", 404);
    }

    if (user.doctorProfile) {
      return errorResponse(res, "Doctor profile already exists", 400);
    }

    // Cek apakah license number sudah digunakan
    const existingLicense = await prisma.doctorProfile.findUnique({
      where: { licenseNumber },
    });

    if (existingLicense) {
      return errorResponse(res, "License number already registered", 400);
    }

    const doctorProfile = await prisma.doctorProfile.create({
      data: {
        userId,
        specialization,
        licenseNumber,
        experience: parseInt(experience),
        education,
        consultationFee: parseFloat(consultationFee),
        bio,
      },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
          },
        },
      },
    });

    return successResponse(
      res,
      doctorProfile,
      "Doctor profile created successfully",
      201
    );
  } catch (error) {
    console.error("Create doctor profile error:", error);
    return errorResponse(res, "Failed to create doctor profile", 500);
  }
};

// Update doctor profile
const updateDoctorProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { userId } = req.params;
    const {
      specialization,
      experience,
      education,
      consultationFee,
      isAvailable,
      bio,
    } = req.body;

    const doctorProfile = await prisma.doctorProfile.findFirst({
      where: { userId },
    });

    if (!doctorProfile) {
      return errorResponse(res, "Doctor profile not found", 404);
    }

    const updatedProfile = await prisma.doctorProfile.update({
      where: { id: doctorProfile.id },
      data: {
        specialization,
        experience: experience ? parseInt(experience) : undefined,
        education,
        consultationFee: consultationFee
          ? parseFloat(consultationFee)
          : undefined,
        isAvailable,
        bio,
      },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
          },
        },
      },
    });

    return successResponse(
      res,
      updatedProfile,
      "Doctor profile updated successfully"
    );
  } catch (error) {
    console.error("Update doctor profile error:", error);
    return errorResponse(res, "Failed to update doctor profile", 500);
  }
};

module.exports = {
  getAllUsers,
  createNewUser,
  getUserById,
  updateUser,
  deleteUser,
  createDoctorProfile,
  updateDoctorProfile,
};
