const Scholarship = require("../Model/ScholarshipModel");
const getPagination = require("../utils/pagination");

// =========================================================
// CREATE SCHOLARSHIP (Admin)
// =========================================================
exports.createScholarship = async (req, res) => {
  try {
    const data = req.body;
    if (req.file) data.logo = req.file.filename;

    const scholarship = await Scholarship.create(data);

    res.status(201).json({
      success: true,
      message: "Scholarship created",
      data: scholarship,
    });
  } catch (err) {
    console.error("Create scholarship error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
    const data = req.body;
    if (req.file) data.logo = req.file.filename;

    const updated = await Scholarship.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true }
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
    res.status(500).json({ success: false, message: "Server error" });
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
// SEARCH SCHOLARSHIPS (with filters)
// =========================================================
exports.searchScholarships = async (req, res) => {
  try {
    const {
      q, // text search
      provider,
      minAmount,
      maxAmount,
      deadline, // before this date
      universityId,
      sort, // deadline_asc, deadline_desc, amount_asc, amount_desc
    } = req.query;

    const { page, limit, skip } = getPagination(req.query);

    const filters = {};

    // Text search
    if (q) {
      filters.$text = { $search: q };
    }

    // Provider filter
    if (provider) {
      filters.provider = { $regex: provider, $options: "i" };
    }

    // Amount filters (parse string amounts like "$5000" or "Full tuition")
    if (minAmount) {
      filters.amount = { $regex: minAmount, $options: "i" };
    }

    // Deadline filter (scholarships with deadline before specified date)
    if (deadline) {
      filters.deadline = { $lte: new Date(deadline) };
    }

    // University filter
    if (universityId) {
      filters.universityId = universityId;
    }

    // Sorting
    let sortObj = { createdAt: -1 };
    if (sort) {
      if (sort === "deadline_asc") sortObj = { deadline: 1 };
      if (sort === "deadline_desc") sortObj = { deadline: -1 };
      if (sort === "name_asc") sortObj = { name: 1 };
      if (sort === "name_desc") sortObj = { name: -1 };
    }

    // Count total
    const total = await Scholarship.countDocuments(filters);
    const totalPages = Math.ceil(total / limit);

    // Fetch data
    const data = await Scholarship.find(filters)
      .populate("universityId", "name country city logo")
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data,
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
    const { days = 30 } = req.query; // default 30 days
    const { page, limit, skip } = getPagination(req.query);

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));

    const total = await Scholarship.countDocuments({
      deadline: {
        $gte: today,
        $lte: futureDate,
      },
    });

    const scholarships = await Scholarship.find({
      deadline: {
        $gte: today,
        $lte: futureDate,
      },
    })
      .populate("universityId", "name country city logo")
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