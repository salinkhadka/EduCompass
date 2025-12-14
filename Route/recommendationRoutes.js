const express = require("express");
const router = express.Router();
const controller = require("../Controller/recommendationController");
const { authenticateUser } = require("../Middleware/authMiddleware");

// =========================================================
// PERSONALIZED RECOMMENDATIONS (Authenticated Users Only)
// =========================================================

// Get all recommendations at once (dashboard)
router.get(
  "/all",
  authenticateUser,
  controller.getAllRecommendations
);

// Get university recommendations
router.get(
  "/universities",
  authenticateUser,
  controller.getUniversityRecommendations
);

// Get course recommendations
router.get(
  "/courses",
  authenticateUser,
  controller.getCourseRecommendations
);

// Get scholarship recommendations
router.get(
  "/scholarships",
  authenticateUser,
  controller.getScholarshipRecommendations
);

module.exports = router;