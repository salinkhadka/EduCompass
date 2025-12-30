const express = require("express");
const router = express.Router();
const controller = require("../Controller/userController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");
const { registerValidator, loginValidator } = require("../utils/userValidator");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// =========================================================
// AUTH ROUTES
// =========================================================
router.post("/register", registerValidator, controller.registerUser);
router.post("/login", loginValidator, controller.loginUser);

// =========================================================
// GOOGLE LOGIN (One Tap or token-based)
// =========================================================
router.post("/google-login", async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;
    let user = await controller.findOrCreateGoogleUser(googleId, email, name);
    
    // Generate JWT token with correct secret and payload structure
    const token = jwt.sign(
      { _id: user._id, email: user.email },  // ✅ Changed to _id
      process.env.SECRET,  // ✅ Changed to SECRET
      { expiresIn: "7d" }
    );
    
    res.json({
      success: true,
      token,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
});

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
// PASSWORD MANAGEMENT
// =========================================================
router.post("/change-password", authenticateUser, controller.changePassword);
router.post("/forgot-password", controller.forgotPassword);
router.get("/verify-reset-token/:token", controller.verifyResetToken);
router.post("/reset-password", controller.resetPassword);

// =========================================================
// SAVED UNIVERSITIES
// =========================================================
router.post("/save-university", authenticateUser, controller.saveUniversity);
router.delete("/save-university/:id", authenticateUser, controller.removeSavedUniversity);
router.get("/saved-universities", authenticateUser, controller.getSavedUniversities);

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
router.delete(
  "/admin/delete-user/:id",
  authenticateUser,
  isAdmin,
  controller.adminDeleteUser
);


module.exports = router;
