const express = require("express");
const { body } = require("express-validator");
const PaymentController = require("../controller/payment");
const { authenticateToken, requirePatient } = require("../middleware/auth");

const router = express.Router();

// Validation rules
const createPaymentValidation = [
  body("consultationId").notEmpty().withMessage("Consultation ID is required"),
];

// Routes - semua memerlukan authentication kecuali webhook
router.post(
  "/",
  authenticateToken,
  requirePatient,
  createPaymentValidation,
  PaymentController.createPayment
);
router.get("/history", authenticateToken, PaymentController.getPaymentHistory);
router.get(
  "/:id/status",
  authenticateToken,
  PaymentController.checkPaymentStatus
);

// Webhook dari Midtrans (tidak perlu auth)
router.post("/webhook", PaymentController.midtransWebhook);

module.exports = router;
