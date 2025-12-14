const express = require("express");
const router = express.Router();
const controller = require("../Controller/analyticsController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");

// =========================================================
// ADMIN ROUTES - Analytics Dashboard
// =========================================================
router.get(
  "/all",
  authenticateUser,
  isAdmin,
  controller.getSearchAnalytics
);

router.get(
  "/popular",
  authenticateUser,
  isAdmin,
  controller.getPopularSearches
);

router.get(
  "/statistics",
  authenticateUser,
  isAdmin,
  controller.getSearchStatistics
);

// =========================================================
// USER ROUTES - Personal Search History
// =========================================================
router.get(
  "/my-history",
  authenticateUser,
  controller.getUserSearchHistory
);

module.exports = router;