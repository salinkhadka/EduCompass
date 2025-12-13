const express = require("express");
const router = express.Router();
const controller = require("../Controller/universityController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");
const upload = require("../Middleware/upload");

// ADMIN ONLY CRUD
router.post("/create", authenticateUser, isAdmin, upload.single("logo"), controller.createUniversity);
router.put("/update/:id", authenticateUser, isAdmin, upload.single("logo"), controller.updateUniversity);
router.delete("/delete/:id", authenticateUser, isAdmin, controller.deleteUniversity);

// PUBLIC
router.get("/getAll", controller.getAllUniversities);
router.get("/get/:id", controller.getUniversityById);

// after existing imports
router.get("/search", controller.searchUniversities);
router.get("/similar/:id", controller.getSimilarUniversities);


module.exports = router;
