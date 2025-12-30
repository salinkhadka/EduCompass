const User = require("../Model/userModel");
const University = require("../Model/universityModel");
const Scholarship = require("../Model/ScholarshipModel");
const Course = require("../Model/CourseModel");
const SearchAnalytics = require("../Model/SearchAnalyticsModel");

// =========================================================
// DASHBOARD OVERVIEW STATS
// =========================================================
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Parallel queries for better performance
    const [
      totalUsers,
      totalUniversities,
      totalScholarships,
      totalCourses,
      recentUsers,
      recentSearches,
      popularSearches,
    ] = await Promise.all([
      User.countDocuments(),
      University.countDocuments(),
      Scholarship.countDocuments(),
      Course.countDocuments(),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      SearchAnalytics.countDocuments({ timestamp: { $gte: sevenDaysAgo } }),
      SearchAnalytics.aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo } } },
        { $group: { _id: "$query", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Get recent user registrations
    const recentRegistrations = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("username email createdAt role")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalUniversities,
          totalScholarships,
          totalCourses,
          recentUsers,
          recentSearches,
        },
        recentRegistrations,
        popularSearches,
      },
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET ALL USERS (Admin)
// =========================================================
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      role = "",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET USER DETAILS (Admin)
// =========================================================
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password")
      .populate("savedUniversities.universityId")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's search history
    const searchHistory = await SearchAnalytics.find({ userId: id })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        user,
        searchHistory,
      },
    });
  } catch (err) {
    console.error("Get user details error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// UPDATE USER ROLE (Admin)
// =========================================================
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["normal", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'normal' or 'admin'",
      });
    }

    // Prevent admin from changing their own role
    if (req.user._id.toString() === id) {
      return res.status(403).json({
        success: false,
        message: "Cannot change your own role",
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (err) {
    console.error("Update user role error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// EXPORT USERS DATA (Admin)
// =========================================================
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("username email role createdAt lastLogin phone preferredCountry degreeLevel studentStatus fieldOfStudy")
      .lean();

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error("Export users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};