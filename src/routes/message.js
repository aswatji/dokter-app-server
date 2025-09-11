const express = require("express");
const { body } = require("express-validator");
const MessageController = require("../controller/message");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Validation rules
const sendMessageValidation = [
  body("consultationId").notEmpty().withMessage("Consultation ID is required"),
  body("content").notEmpty().withMessage("Message content is required"),
  body("messageType")
    .optional()
    .isIn(["TEXT", "IMAGE", "FILE", "VOICE"])
    .withMessage("Invalid message type"),
];

// Routes - semua memerlukan authentication
router.use(authenticateToken);

// Send message
router.post("/", sendMessageValidation, MessageController.sendMessage);

// Get messages from consultation
router.get("/consultation/:consultationId", MessageController.getMessages);

// Get unread count
router.get("/unread/count", MessageController.getUnreadCount);

// Mark messages as read
router.put("/consultation/:consultationId/read", MessageController.markAsRead);

// Delete message
router.delete("/:id", MessageController.deleteMessage);

module.exports = router;
