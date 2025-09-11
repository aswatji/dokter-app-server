const express = require("express");
const { upload, handleUploadError } = require("../middleware/upload");
const { authenticateToken } = require("../middleware/auth");
const { successResponse, errorResponse } = require("../utils/response");
const path = require("path");

const router = express.Router();

// Upload file endpoint
router.post(
  "/",
  authenticateToken,
  upload.single("file"),
  handleUploadError,
  (req, res) => {
    try {
      if (!req.file) {
        return errorResponse(res, "No file uploaded", 400);
      }

      const fileUrl = `/uploads/${path.basename(path.dirname(req.file.path))}/${
        req.file.filename
      }`;

      const fileData = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date(),
      };

      return successResponse(res, fileData, "File uploaded successfully", 201);
    } catch (error) {
      console.error("Upload file error:", error);
      return errorResponse(res, "Failed to upload file", 500);
    }
  }
);

module.exports = router;
