const Course = require("../Model/CourseModel");
const University = require("../Model/universityModel");
const pagination = require("../utils/pagination");

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
// GLOBAL COURSE SEARCH (Enhanced)
// =========================================================
exports.searchCourses = async (req, res) => {
  try {
    const {
      q, // Single search - course name, field, university name
      country, // Country code from courseId (e.g., jp, us, uk)
      level, // UG, PG, PhD
      field, // Engineering, Business, etc.
      minTuition,
      maxTuition,
      duration, // "2 years", "4 years"
      type, // University type (Public/Private)
      sort, // tuition_asc, tuition_desc, name_asc, duration_asc
      page = 1,
      limit = 20,
    } = req.query;

    const { skip } = pagination({ page, limit });
    let filter = {};

    // ============================================
    // 1. SINGLE SEARCH BAR
    // Searches: course name, field, and university name (via populate)
    // ============================================
    if (q && q.trim()) {
      const searchTerm = q.trim();
      // We'll search course name and field with regex
      // University name search requires fetching after population
      filter.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { field: { $regex: searchTerm, $options: "i" } },
        { courseId: { $regex: searchTerm, $options: "i" } }
      ];
    }

    // ============================================
    // 2. COUNTRY FILTER (from courseId)
    // Format: course_{country}_{number}
    // Example: course_jp_001, course_us_002
    // ============================================
    if (country && country.trim()) {
      const countryLower = country.toLowerCase().trim();
      filter.courseId = { 
        $regex: `_${countryLower}_`, 
        $options: "i" 
      };
    }

    // ============================================
    // 3. LEVEL FILTER (UG, PG, PhD)
    // ============================================
    if (level && level.trim()) {
      // Support comma-separated levels for multiple selection
      const levels = level.split(',').map(l => l.trim().toUpperCase());
      filter.level = { $in: levels };
    }

    // ============================================
    // 4. FIELD FILTER
    // ============================================
    if (field && field.trim()) {
      // Support comma-separated fields for multiple selection
      const fields = field.split(',').map(f => f.trim());
      filter.field = { 
        $in: fields.map(f => new RegExp(f, 'i'))
      };
    }

    // ============================================
    // 5. TUITION RANGE FILTER
    // ============================================
    if (minTuition || maxTuition) {
      filter.tuitionFee = {};
      if (minTuition) filter.tuitionFee.$gte = Number(minTuition);
      if (maxTuition) filter.tuitionFee.$lte = Number(maxTuition);
    }

    // ============================================
    // 6. DURATION FILTER
    // ============================================
    if (duration && duration.trim()) {
      filter.duration = { $regex: duration.trim(), $options: "i" };
    }

    // ============================================
    // 7. UNIVERSITY TYPE FILTER
    // If type filter is used, we need to filter by university
    // ============================================
    let universityIds = null;
    if (type && type.trim()) {
      const universities = await University.find({ type: type.trim() })
        .select("_id")
        .lean();
      universityIds = universities.map((u) => u._id);
      
      if (universityIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          meta: {
            total: 0,
            page: Number(page),
            limit: Number(limit),
            totalPages: 0,
          },
        });
      }
      
      filter.universityId = { $in: universityIds };
    }

    // ============================================
    // 8. FETCH COURSES WITH POPULATION
    // ============================================
    let courses = await Course.find(filter)
      .populate("universityId", "name country city logo type ranking")
      .lean();

    // ============================================
    // 9. ADDITIONAL FILTERING BY UNIVERSITY NAME (post-populate)
    // If search query might match university name
    // ============================================
    if (q && q.trim()) {
      const searchTerm = q.trim().toLowerCase();
      courses = courses.filter(course => {
        const matchesCourseName = course.name.toLowerCase().includes(searchTerm);
        const matchesField = course.field?.toLowerCase().includes(searchTerm);
        const matchesUniversity = course.universityId?.name?.toLowerCase().includes(searchTerm);
        const matchesCourseId = course.courseId.toLowerCase().includes(searchTerm);
        
        return matchesCourseName || matchesField || matchesUniversity || matchesCourseId;
      });
    }

    // ============================================
    // 10. SORTING
    // ============================================
    if (sort) {
      courses.sort((a, b) => {
        if (sort === "tuition_asc") {
          return (a.tuitionFee || 0) - (b.tuitionFee || 0);
        }
        if (sort === "tuition_desc") {
          return (b.tuitionFee || 0) - (a.tuitionFee || 0);
        }
        if (sort === "name_asc") {
          return a.name.localeCompare(b.name);
        }
        if (sort === "name_desc") {
          return b.name.localeCompare(a.name);
        }
        if (sort === "duration_asc") {
          const durationA = parseInt((a.duration || "0").match(/\d+/)?.[0] || 0);
          const durationB = parseInt((b.duration || "0").match(/\d+/)?.[0] || 0);
          return durationA - durationB;
        }
        if (sort === "duration_desc") {
          const durationA = parseInt((a.duration || "0").match(/\d+/)?.[0] || 0);
          const durationB = parseInt((b.duration || "0").match(/\d+/)?.[0] || 0);
          return durationB - durationA;
        }
        return 0;
      });
    } else {
      // Default sort by name
      courses.sort((a, b) => a.name.localeCompare(b.name));
    }

    // ============================================
    // 11. PAGINATION
    // ============================================
    const total = courses.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedCourses = courses.slice(skip, skip + Number(limit));

    return res.status(200).json({
      success: true,
      data: paginatedCourses,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
      },
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
      .populate("universityId", "name country city logo website ranking type")
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