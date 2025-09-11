const express = require("express");
const { body } = require("express-validator");
const AuthController = require("../controller/auth");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Validation rules
const registerValidation = [
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
    .isIn(["PATIENT", "DOCTOR"])
    .withMessage("Invalid role"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const updateProfileValidation = [
  body("fullname")
    .optional()
    .notEmpty()
    .withMessage("Full name cannot be empty"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

// Public routes
router.post("/register", registerValidation, AuthController.register);
router.post("/login", loginValidation, AuthController.login);

// Protected routes
router.get("/profile", authenticateToken, AuthController.getProfile);
router.put(
  "/profile",
  authenticateToken,
  updateProfileValidation,
  AuthController.updateProfile
);
router.put(
  "/change-password",
  authenticateToken,
  changePasswordValidation,
  AuthController.changePassword
);

module.exports = router;
