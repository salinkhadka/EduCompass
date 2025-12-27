const express = require("express");
const router = express.Router();
const controller = require("../Controller/courseController");
const { authenticateUser, isAdmin } = require("../Middleware/authMiddleware");

// ADMIN
router.post("/create", authenticateUser, isAdmin, controller.createCourse);
router.put("/update/:id", authenticateUser, isAdmin, controller.updateCourse);
router.delete("/delete/:id", authenticateUser, isAdmin, controller.deleteCourse);

// PUBLIC
router.get("/university/:universityId", controller.getCoursesByUniversity);

router.get("/search", controller.searchCourses);
router.get("/:id", controller.getCourseById);

module.exports = router;
