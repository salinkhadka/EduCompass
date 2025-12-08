const express = require("express");
const router = express.Router();
const controller = require("../Controllers/AuthController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");

// AUTH
router.post("/register", upload.single("profilePhoto"), controller.registerUser);
router.post("/login", controller.loginUser);

// PROFILE
router.get("/me", authenticateUser, controller.getProfile);
router.put("/update", authenticateUser, upload.single("profilePhoto"), controller.updateProfile);

// SAVED UNIVERSITIES
router.post("/save-university", authenticateUser, controller.saveUniversity);
router.get("/saved-universities", authenticateUser, controller.getSavedUniversities);

// SAVED SCHOLARSHIPS
router.post("/save-scholarship", authenticateUser, controller.saveScholarship);
router.get("/saved-scholarships", authenticateUser, controller.getSavedScholarships);

module.exports = router;
