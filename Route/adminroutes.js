const express = require("express");
const router = express.Router();
const adminController = require("../Controller/adminController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");

// All admin routes require authentication + admin role
router.use(authenticateUser, isAdmin);

// =========================================================
// DASHBOARD
// =========================================================
router.get("/dashboard/stats", adminController.getDashboardStats);

// =========================================================
// USER MANAGEMENT
// =========================================================
router.get("/users", adminController.getAllUsers);
router.get("/users/export", adminController.exportUsers);
router.get("/users/:id", adminController.getUserDetails);
router.put("/users/:id/role", adminController.updateUserRole);

module.exports = router;