const SearchAnalytics = require("../Model/SearchAnalyticsModel");
const User = require("../Model/UserModel");

// =========================================================
// TRACK SEARCH (Called from search endpoints)
// =========================================================
exports.trackSearch = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || query.trim() === "") return; // skip empty queries

    const searchAnalytics = new SearchAnalytics({
      query: query.trim(),
      userId: req.user?._id || null,
    });
    await searchAnalytics.save();
  } catch (err) {
    console.error("Track search error:", err);
  }
  next();
};


// =========================================================
// GET SEARCH ANALYTICS (Admin)
// =========================================================
exports.getSearchAnalytics = async (req, res) => {
  try {
    const {
      category,
      startDate,
      endDate,
      limit = 100,
      page = 1,
    } = req.query;

    const filters = {};

    if (category) {
      filters.category = category;
    }

    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const total = await SearchAnalytics.countDocuments(filters);

    const analytics = await SearchAnalytics.find(filters)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: analytics,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get analytics error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET POPULAR SEARCHES (Admin)
// =========================================================
exports.getPopularSearches = async (req, res) => {
  try {
    const { category, days = 30, limit = 10 } = req.query;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));

    const matchStage = {
      timestamp: { $gte: dateFilter },
    };

    if (category) {
      matchStage.category = category;
    }

    const popular = await SearchAnalytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$query",
          count: { $sum: 1 },
          category: { $first: "$category" },
          avgResults: { $avg: "$resultCount" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      success: true,
      data: popular,
    });
  } catch (err) {
    console.error("Get popular searches error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SEARCH STATISTICS (Admin)
// =========================================================
exports.getSearchStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));

    const stats = await SearchAnalytics.aggregate([
      { $match: { timestamp: { $gte: dateFilter } } },
      {
        $group: {
          _id: "$category",
          totalSearches: { $sum: 1 },
          avgResults: { $avg: "$resultCount" },
          uniqueQueries: { $addToSet: "$query" },
        },
      },
      {
        $project: {
          category: "$_id",
          totalSearches: 1,
          avgResults: { $round: ["$avgResults", 2] },
          uniqueQueriesCount: { $size: "$uniqueQueries" },
        },
      },
    ]);

    // Overall statistics
    const totalSearches = await SearchAnalytics.countDocuments({
      timestamp: { $gte: dateFilter },
    });

    const totalUsers = await SearchAnalytics.distinct("userId", {
      timestamp: { $gte: dateFilter },
      userId: { $ne: null },
    });

    res.status(200).json({
      success: true,
      data: {
        overall: {
          totalSearches,
          uniqueUsers: totalUsers.length,
        },
        byCategory: stats,
        period: `Last ${days} days`,
      },
    });
  } catch (err) {
    console.error("Get search statistics error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET USER SEARCH HISTORY (User)
// =========================================================
exports.getUserSearchHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { category, limit = 50, page = 1 } = req.query;

    const filters = { userId: req.user._id };
    if (category) filters.category = category;

    const skip = (page - 1) * limit;
    const total = await SearchAnalytics.countDocuments(filters);

    const history = await SearchAnalytics.find(filters)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("query category resultCount timestamp")
      .lean();

    res.status(200).json({
      success: true,
      data: history,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get user search history error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};