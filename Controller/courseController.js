const Course = require("../Model/CourseModel");
const University = require("../Model/universityModel");
const pagination = require("../utils/pagination");
const { trackSearch } = require("../Controller/analyticsController");

// =========================================================
// CREATE COURSE (Admin)
// =========================================================
exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    
    res.status(201).json({
      success: true,
      message: "Course created",
      data: course,
    });
  } catch (err) {
    console.error("Create course error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET ALL COURSES FOR A UNIVERSITY
// =========================================================
exports.getCoursesByUniversity = async (req, res) => {
  try {
    const courses = await Course.find({ universityId: req.params.universityId })
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (err) {
    console.error("Get courses by university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// UPDATE COURSE (Admin)
// =========================================================
exports.updateCourse = async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated)
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });

    res.status(200).json({
      success: true,
      message: "Course updated",
      data: updated,
    });
  } catch (err) {
    console.error("Update course error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// DELETE COURSE (Admin)
// =========================================================
exports.deleteCourse = async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });

    res.status(200).json({
      success: true,
      message: "Course deleted",
    });
  } catch (err) {
    console.error("Delete course error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GLOBAL COURSE SEARCH (with Analytics)
// =========================================================
exports.searchCourses = async (req, res) => {
  try {
    const {
      name,
      level,
      field,
      minTuition,
      maxTuition,
      country,
      type,
      page = 1,
      limit = 10,
    } = req.query;

    let filter = {};

    // Filter by course name
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // Filter by level (UG/PG/PhD)
    if (level) {
      filter.level = level;
    }

    // Filter by field
    if (field) {
      filter.field = { $regex: field, $options: "i" };
    }

    // Tuition filter
    if (minTuition || maxTuition) {
      filter.tuitionFee = {};
      if (minTuition) filter.tuitionFee.$gte = Number(minTuition);
      if (maxTuition) filter.tuitionFee.$lte = Number(maxTuition);
    }

    // If country or type filter is used, we need university info
    let universityFilter = {};
    if (country) universityFilter.country = country;
    if (type) universityFilter.type = type;

    let universityIds = null;

    if (country || type) {
      const universities = await University.find(universityFilter)
        .select("_id")
        .lean();
      universityIds = universities.map((u) => u._id);
      
      if (universityIds.length === 0) {
        // Track search with 0 results
        await trackSearch(
          req.user?._id,
          name || field || "",
          { level, field, minTuition, maxTuition, country, type },
          0,
          "course"
        );

        return res.status(200).json({
          success: true,
          total: 0,
          page: Number(page),
          totalPages: 0,
          data: [],
        });
      }
      
      filter.universityId = { $in: universityIds };
    }

    // Pagination calculation
    const skip = (page - 1) * limit;

    // Find courses
    const courses = await Course.find(filter)
      .populate("universityId", "name country city logo type ranking")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Course.countDocuments(filter);

    // Track search analytics
    await trackSearch(
      req.user?._id,
      name || field || "",
      { level, field, minTuition, maxTuition, country, type },
      total,
      "course"
    );

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: courses,
    });
  } catch (err) {
    console.error("Search courses error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================================================
// GET COURSE BY ID
// =========================================================
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("universityId", "name country city logo website ranking")
      .lean();

    if (!course)
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (err) {
    console.error("Get course by ID error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};