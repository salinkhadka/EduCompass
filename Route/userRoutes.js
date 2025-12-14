const express = require("express");
const router = express.Router();
const controller = require("../Controller/userController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");
const { registerValidator, loginValidator } = require("../utils/userValidator");

// =========================================================
// AUTH ROUTES
// =========================================================
router.post("/register", registerValidator, controller.registerUser);
router.post("/login", loginValidator, controller.loginUser);

// =========================================================
// PROFILE ROUTES
// =========================================================
router.get("/me", authenticateUser, controller.getProfile);
router.put(
  "/update",
  authenticateUser,
  upload.single("profilePhoto"),
  controller.updateProfile
);

// =========================================================
// SAVED UNIVERSITIES
// =========================================================
router.post("/save-university", authenticateUser, controller.saveUniversity);
router.get("/saved-universities", authenticateUser, controller.getSavedUniversities);
router.delete(
  "/remove-university/:universityId",
  authenticateUser,
  controller.removeSavedUniversity
);

// =========================================================
// SAVED SCHOLARSHIPS
// =========================================================
router.post("/save-scholarship", authenticateUser, controller.saveScholarship);
router.get("/saved-scholarships", authenticateUser, controller.getSavedScholarships);
router.delete(
  "/remove-scholarship/:scholarshipId",
  authenticateUser,
  controller.removeSavedScholarship
);

// =========================================================
// RECENT SEARCHES
// =========================================================
router.get("/recent-searches", authenticateUser, controller.getRecentSearches);

module.exports = router;