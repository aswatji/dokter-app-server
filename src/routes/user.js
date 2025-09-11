const express = require("express");
const { body } = require("express-validator");
const UserController = require("../controller/user");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Validation rules
const createUserValidation = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("fullname").notEmpty().withMessage("Full name is required"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  body("role")
    .optional()
    .isIn(["PATIENT", "DOCTOR", "ADMIN"])
    .withMessage("Invalid role"),
];

const updateUserValidation = [
  body("fullname")
    .optional()
    .notEmpty()
    .withMessage("Full name cannot be empty"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be boolean"),
];

const doctorProfileValidation = [
  body("specialization").notEmpty().withMessage("Specialization is required"),
  body("licenseNumber").notEmpty().withMessage("License number is required"),
  body("experience")
    .isInt({ min: 0 })
    .withMessage("Experience must be a positive number"),
  body("education").notEmpty().withMessage("Education is required"),
  body("consultationFee")
    .isFloat({ min: 0 })
    .withMessage("Consultation fee must be a positive number"),
  body("bio").optional().isString().withMessage("Bio must be a string"),
];

const updateDoctorProfileValidation = [
  body("specialization")
    .optional()
    .notEmpty()
    .withMessage("Specialization cannot be empty"),
  body("experience")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Experience must be a positive number"),
  body("education")
    .optional()
    .notEmpty()
    .withMessage("Education cannot be empty"),
  body("consultationFee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Consultation fee must be a positive number"),
  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be boolean"),
  body("bio").optional().isString().withMessage("Bio must be a string"),
];

// Routes yang memerlukan authentication dan admin role
router.use(authenticateToken);

// Get all users (admin only)
router.get("/", requireAdmin, UserController.getAllUsers);

// Create new user (admin only)
router.post(
  "/",
  requireAdmin,
  createUserValidation,
  UserController.createNewUser
);

// Get user by ID (admin only)
router.get("/:id", requireAdmin, UserController.getUserById);

// Update user (admin only)
router.put(
  "/:id",
  requireAdmin,
  updateUserValidation,
  UserController.updateUser
);

// Delete user (admin only)
router.delete("/:id", requireAdmin, UserController.deleteUser);

// Doctor profile routes (admin only)
router.post(
  "/:userId/doctor-profile",
  requireAdmin,
  doctorProfileValidation,
  UserController.createDoctorProfile
);
router.put(
  "/:userId/doctor-profile",
  requireAdmin,
  updateDoctorProfileValidation,
  UserController.updateDoctorProfile
);

module.exports = router;
