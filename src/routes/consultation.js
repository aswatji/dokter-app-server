const express = require("express");
const { body } = require("express-validator");
const ConsultationController = require("../controller/consultation");
const {
  authenticateToken,
  requirePatient,
  requireDoctor,
} = require("../middleware/auth");

const router = express.Router();

// Validation rules
const createConsultationValidation = [
  body("doctorId").notEmpty().withMessage("Doctor ID is required"),
  body("title").notEmpty().withMessage("Title is required"),
  body("description").notEmpty().withMessage("Description is required"),
];

const updateStatusValidation = [
  body("status")
    .isIn(["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"])
    .withMessage("Invalid status"),
];

// Routes - semua memerlukan authentication
router.use(authenticateToken);

// Get available doctors - taruh di atas route dengan parameter
router.get("/doctors/available", ConsultationController.getAvailableDoctors);

// Create consultation (hanya pasien)
router.post(
  "/",
  requirePatient,
  createConsultationValidation,
  ConsultationController.createConsultation
);

// Get my consultations
router.get("/", ConsultationController.getMyConsultations);

// Get consultation detail
router.get("/:id", ConsultationController.getConsultationDetail);

// Update consultation status (hanya dokter)
router.put(
  "/:id/status",
  requireDoctor,
  updateStatusValidation,
  ConsultationController.updateConsultationStatus
);

module.exports = router;
