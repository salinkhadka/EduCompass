const Scholarship = require("../Model/ScholarshipModel");
const getPagination = require("../utils/pagination");

// Helper function to clean data before saving
const cleanScholarshipData = (data) => {
  const cleaned = { ...data };
  
  // Convert empty strings to null for ObjectId fields
  if (cleaned.universityId === "" || cleaned.universityId === undefined) {
    cleaned.universityId = null;
  }
  
  // Filter out empty course IDs
  if (Array.isArray(cleaned.courseIds)) {
    cleaned.courseIds = cleaned.courseIds.filter(id => id && id.trim() !== "");
    if (cleaned.courseIds.length === 0) {
      cleaned.courseIds = [];
    }
  }
  
  // Filter out empty eligibility items
  if (Array.isArray(cleaned.eligibility)) {
    cleaned.eligibility = cleaned.eligibility.filter(item => item && item.trim() !== "");
  }
  
  return cleaned;
};

// =========================================================
// CREATE SCHOLARSHIP (Admin)
// =========================================================
exports.createScholarship = async (req, res) => {
  try {
    const data = cleanScholarshipData(req.body);
    if (req.file) data.logo = req.file.filename;

    const scholarship = await Scholarship.create(data);

    res.status(201).json({
      success: true,
      message: "Scholarship created",
      data: scholarship,
    });
  } catch (err) {
    console.error("Create scholarship error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// =========================================================
// GET ALL SCHOLARSHIPS (with pagination)
// =========================================================
exports.getAllScholarships = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    
    const total = await Scholarship.countDocuments();
    const data = await Scholarship.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get all scholarships error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SCHOLARSHIP BY ID
// =========================================================
exports.getScholarship = async (req, res) => {
  try {
    const data = await Scholarship.findById(req.params.id)
      .populate("universityId", "name country city logo")
      .populate("courseIds", "name level field")
      .lean();

    if (!data)
      return res.status(404).json({
        success: false,
        message: "Scholarship not found",
      });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Get scholarship error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// UPDATE SCHOLARSHIP (Admin)
// =========================================================
exports.updateScholarship = async (req, res) => {
  try {
    const data = cleanScholarshipData(req.body);
    if (req.file) data.logo = req.file.filename;

    const updated = await Scholarship.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!updated)
      return res.status(404).json({
        success: false,
        message: "Scholarship not found",
      });

    res.status(200).json({
      success: true,
      message: "Scholarship updated",
      data: updated,
    });
  } catch (err) {
    console.error("Update scholarship error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message || "Server error" 
    });
  }
};

// =========================================================
// GET SCHOLARSHIPS BY COURSE ID
// =========================================================
exports.getScholarshipsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const scholarships = await Scholarship.find({
      courseIds: courseId,
    })
      .populate("universityId", "name country city logo")
      .populate("courseIds", "name level field")
      .sort({ deadline: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: scholarships,
    });
  } catch (err) {
    console.error("Get scholarships by course error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// =========================================================
// DELETE SCHOLARSHIP (Admin)
// =========================================================
exports.deleteScholarship = async (req, res) => {
  try {
    const deleted = await Scholarship.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({
        success: false,
        message: "Scholarship not found",
      });

    res.status(200).json({
      success: true,
      message: "Scholarship deleted",
    });
  } catch (err) {
    console.error("Delete scholarship error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// SEARCH SCHOLARSHIPS (with advanced filters)
// =========================================================
exports.searchScholarships = async (req, res) => {
  try {
    const {
      q,
      country,
      minAmount,
      maxAmount,
      fromDate,
      toDate,
      courseLevel,
      courseField,
      universityId,
      sort,
    } = req.query;

    const { page, limit, skip } = getPagination(req.query);

    const filters = {};

    if (q && q.trim()) {
      filters.$or = [
        { name: { $regex: q.trim(), $options: "i" } },
        { provider: { $regex: q.trim(), $options: "i" } },
        { overview: { $regex: q.trim(), $options: "i" } }
      ];
    }

    if (country && country.trim()) {
      const countryLower = country.toLowerCase().trim();
      filters.scholarshipId = { 
        $regex: `_${countryLower}_`, 
        $options: "i" 
      };
    }

    if (universityId) {
      filters.universityId = universityId;
    }

    let scholarships = await Scholarship.find(filters)
      .populate("universityId", "name country city logo")
      .populate("courseIds", "name level field courseId")
      .lean();

    // Helper function to parse "Month Day" format to Date object
    const parseDeadline = (deadlineStr) => {
      if (!deadlineStr) return null;
      
      try {
        // Parse "October 15" format
        const currentYear = 2026;
        const deadline = new Date(`${deadlineStr}, ${currentYear}`);
        
        // If invalid date, return null
        if (isNaN(deadline.getTime())) {
          return null;
        }
        
        return deadline;
      } catch (error) {
        return null;
      }
    };

    // Filter by date range
    if (fromDate || toDate) {
      scholarships = scholarships.filter(scholarship => {
        const deadlineDate = parseDeadline(scholarship.deadline);
        
        // Skip if deadline can't be parsed
        if (!deadlineDate) return false;
        
        if (fromDate) {
          const fromDateObj = new Date(fromDate);
          if (deadlineDate < fromDateObj) return false;
        }
        
        if (toDate) {
          const toDateObj = new Date(toDate);
          // Set to end of day for toDate
          toDateObj.setHours(23, 59, 59, 999);
          if (deadlineDate > toDateObj) return false;
        }
        
        return true;
      });
    }

    if (minAmount || maxAmount) {
      scholarships = scholarships.filter(scholarship => {
        const amountStr = scholarship.amount || "";
        
        const match = amountStr.match(/[\d,]+/);
        if (!match) {
          return !minAmount && !maxAmount;
        }
        
        const amount = parseInt(match[0].replace(/,/g, ""));
        
        if (minAmount && amount < parseInt(minAmount)) return false;
        if (maxAmount && amount > parseInt(maxAmount)) return false;
        
        return true;
      });
    }

    if (courseLevel && courseLevel.trim()) {
      const levelUpper = courseLevel.toUpperCase().trim();
      
      scholarships = scholarships.filter(scholarship => {
        if (!scholarship.courseIds || scholarship.courseIds.length === 0) {
          return false;
        }
        
        return scholarship.courseIds.some(course => 
          course.level && 
          course.level.toUpperCase() === levelUpper
        );
      });
    }

    if (courseField && courseField.trim()) {
      scholarships = scholarships.filter(scholarship => {
        if (!scholarship.courseIds || scholarship.courseIds.length === 0) {
          return false;
        }
        
        return scholarship.courseIds.some(course => 
          course.field && 
          course.field.toLowerCase().includes(courseField.toLowerCase().trim())
        );
      });
    }

    if (sort) {
      scholarships.sort((a, b) => {
        if (sort === "deadline_asc" || sort === "deadline_desc") {
          const dateA = parseDeadline(a.deadline);
          const dateB = parseDeadline(b.deadline);
          
          // Handle null dates - push them to the end
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          return sort === "deadline_asc" 
            ? dateA - dateB 
            : dateB - dateA;
        }
        if (sort === "name_asc") {
          return a.name.localeCompare(b.name);
        }
        if (sort === "name_desc") {
          return b.name.localeCompare(a.name);
        }
        if (sort === "amount_asc" || sort === "amount_desc") {
          const getAmount = (amountStr) => {
            const match = (amountStr || "").match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, "")) : 0;
          };
          const amountA = getAmount(a.amount);
          const amountB = getAmount(b.amount);
          return sort === "amount_asc" ? amountA - amountB : amountB - amountA;
        }
        return 0;
      });
    } else {
      scholarships.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    const total = scholarships.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = scholarships.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Search scholarships error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SCHOLARSHIPS BY UNIVERSITY
// =========================================================
exports.getScholarshipsByUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;

    const scholarships = await Scholarship.find({ universityId })
      .sort({ deadline: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: scholarships,
    });
  } catch (err) {
    console.error("Get scholarships by university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET UPCOMING DEADLINES
// =========================================================
exports.getUpcomingDeadlines = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));

    const total = await Scholarship.countDocuments({
      deadline: {
        $gte: today.toISOString(),
        $lte: futureDate.toISOString(),
      },
    });

    const scholarships = await Scholarship.find({
      deadline: {
        $gte: today.toISOString(),
        $lte: futureDate.toISOString(),
      },
    })
      .populate("universityId", "name country city logo")
      .populate("courseIds", "name level field")
      .sort({ deadline: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: scholarships,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get upcoming deadlines error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};