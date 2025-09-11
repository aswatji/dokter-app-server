const { successResponse, errorResponse } = require("../utils/response");
const prisma = require("../config/database");
const { validationResult } = require("express-validator");

// Buat konsultasi baru (untuk pasien)
const createConsultation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { doctorId, title, description } = req.body;
    const patientId = req.user.id;

    // Cek apakah dokter ada dan aktif
    const doctor = await prisma.user.findFirst({
      where: {
        id: doctorId,
        role: "DOCTOR",
        isActive: true,
      },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || !doctor.doctorProfile) {
      return errorResponse(res, "Doctor not found or not available", 404);
    }

    // Cek apakah dokter tersedia
    if (!doctor.doctorProfile.isAvailable) {
      return errorResponse(res, "Doctor is currently not available", 400);
    }

    // Buat konsultasi baru
    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        doctorId,
        title,
        description,
      },
      include: {
        patient: {
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
          },
        },
        doctor: {
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
      consultation,
      "Consultation created successfully",
      201
    );
  } catch (error) {
    console.error("Create consultation error:", error);
    return errorResponse(res, "Failed to create consultation", 500);
  }
};

// Get semua konsultasi untuk user yang login
const getMyConsultations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const whereClause =
      req.user.role === "DOCTOR" ? { doctorId: userId } : { patientId: userId };

    if (status) {
      whereClause.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const consultations = await prisma.consultation.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: parseInt(limit),
    });

    const totalCount = await prisma.consultation.count({
      where: whereClause,
    });

    return successResponse(
      res,
      {
        consultations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
      "Consultations retrieved successfully"
    );
  } catch (error) {
    console.error("Get consultations error:", error);
    return errorResponse(res, "Failed to get consultations", 500);
  }
};

// Get detail konsultasi
const getConsultationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const consultation = await prisma.consultation.findFirst({
      where: {
        id,
        OR: [{ patientId: userId }, { doctorId: userId }],
      },
      include: {
        patient: {
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                fullname: true,
                photo: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        payment: true,
      },
    });

    if (!consultation) {
      return errorResponse(res, "Consultation not found", 404);
    }

    return successResponse(
      res,
      consultation,
      "Consultation detail retrieved successfully"
    );
  } catch (error) {
    console.error("Get consultation detail error:", error);
    return errorResponse(res, "Failed to get consultation detail", 500);
  }
};

// Update status konsultasi (untuk dokter)
const updateConsultationStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Hanya dokter yang bisa update status
    if (req.user.role !== "DOCTOR") {
      return errorResponse(
        res,
        "Only doctors can update consultation status",
        403
      );
    }

    const consultation = await prisma.consultation.findFirst({
      where: {
        id,
        doctorId: userId,
      },
    });

    if (!consultation) {
      return errorResponse(res, "Consultation not found", 404);
    }

    const updateData = { status };

    // Set waktu mulai jika status menjadi ACTIVE
    if (status === "ACTIVE" && !consultation.startTime) {
      updateData.startTime = new Date();
    }

    // Set waktu selesai jika status menjadi COMPLETED
    if (status === "COMPLETED" && !consultation.endTime) {
      updateData.endTime = new Date();
    }

    const updatedConsultation = await prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
          },
        },
        doctor: {
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
      updatedConsultation,
      "Consultation status updated successfully"
    );
  } catch (error) {
    console.error("Update consultation status error:", error);
    return errorResponse(res, "Failed to update consultation status", 500);
  }
};

// Get daftar dokter yang tersedia
const getAvailableDoctors = async (req, res) => {
  try {
    const { specialization, page = 1, limit = 10 } = req.query;

    const whereClause = {
      role: "DOCTOR",
      isActive: true,
      doctorProfile: {
        isAvailable: true,
      },
    };

    if (specialization) {
      whereClause.doctorProfile.specialization = {
        contains: specialization,
        mode: "insensitive",
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await prisma.user.findMany({
      where: whereClause,
      include: {
        doctorProfile: true,
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        photo: true,
        doctorProfile: true,
      },
      skip,
      take: parseInt(limit),
    });

    const totalCount = await prisma.user.count({
      where: whereClause,
    });

    return successResponse(
      res,
      {
        doctors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit),
        },
      },
      "Available doctors retrieved successfully"
    );
  } catch (error) {
    console.error("Get available doctors error:", error);
    return errorResponse(res, "Failed to get available doctors", 500);
  }
};

module.exports = {
  createConsultation,
  getMyConsultations,
  getConsultationDetail,
  updateConsultationStatus,
  getAvailableDoctors,
};
