const express = require("express");
const router = express.Router();

const controller = require("../Controller/universityController");
const { trackSearch } = require("../Controller/analyticsController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");

// =========================
// ADMIN ONLY CRUD
// =========================
router.post(
  "/create",
  authenticateUser,
  isAdmin,
  upload.single("logo"),
  controller.createUniversity
);

router.put(
  "/update/:id",
  authenticateUser,
  isAdmin,
  upload.single("logo"),
  controller.updateUniversity
);

router.delete(
  "/delete/:id",
  authenticateUser,
  isAdmin,
  controller.deleteUniversity
);

// =========================
// PUBLIC ROUTES (ORDER MATTERS)
// =========================
router.get("/search", trackSearch, controller.searchUniversities);
router.get("/similar/:id", controller.getSimilarUniversities);
router.get("/getAll", controller.getAllUniversities);
router.get("/get/:id", controller.getUniversityById);

module.exports = router;
