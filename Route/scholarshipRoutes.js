const express = require("express");
const router = express.Router();
const controller = require("../Controller/scholarshipController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");

// =========================================================
// ADMIN ROUTES
// =========================================================
router.post(
  "/create",
  authenticateUser,
  isAdmin,
  upload.single("logo"),
  controller.createScholarship
);

router.put(
  "/update/:id",
  authenticateUser,
  isAdmin,
  upload.single("logo"),
  controller.updateScholarship
);

router.delete(
  "/delete/:id",
  authenticateUser,
  isAdmin,
  controller.deleteScholarship
);

// =========================================================
// PUBLIC ROUTES
// =========================================================
router.get("/getAll", controller.getAllScholarships);
router.get("/get/:id", controller.getScholarship);
router.get("/search", controller.searchScholarships);
router.get("/university/:universityId", controller.getScholarshipsByUniversity);
router.get("/upcoming-deadlines", controller.getUpcomingDeadlines);

module.exports = router;