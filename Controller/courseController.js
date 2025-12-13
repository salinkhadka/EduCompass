const Course = require("../Model/CourseModel");
const pagination = require("../utils/pagination");

// CREATE COURSE (Admin)
exports.createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, message: "Course created", data: course });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL COURSES FOR A UNIVERSITY
exports.getCoursesByUniversity = async (req, res) => {
  try {
    const courses = await Course.find({ universityId: req.params.universityId });
    res.status(200).json({ success: true, data: courses });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE COURSE (Admin)
exports.updateCourse = async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE COURSE (Admin)
exports.deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Course deleted" });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GLOBAL COURSE SEARCH
exports.searchCourses = async (req, res) => {
  try {
    const {
      name,
      level,
      language,
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

    // Filter by level (ug/pg)
    if (level) {
      filter.level = level; // "UG" or "PG"
    }

    // Filter by language
    if (language) {
      filter.language = language;
    }

    // Filter by field/keywords
    if (field) {
      filter.highlights = { $regex: field, $options: "i" };
    }

    // Tuition filter
    if (minTuition || maxTuition) {
      filter.tuition = {};
      if (minTuition) filter.tuition.$gte = Number(minTuition);
      if (maxTuition) filter.tuition.$lte = Number(maxTuition);
    }

    // If country or type filter is used, we also need university info
    let universityFilter = {};
    if (country) universityFilter.country = country;
    if (type) universityFilter.type = type;

    let universityIds = null;

    if (country || type) {
      const universities = await University.find(universityFilter).select("_id");
      universityIds = universities.map((u) => u._id);
      filter.universityId = { $in: universityIds };
    }

    // Pagination calculation
    const skip = (page - 1) * limit;

    // Find
    const courses = await Course.find(filter)
      .populate("universityId", "name country city logo")
      .skip(skip)
      .limit(Number(limit));

    const total = await Course.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: courses,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

