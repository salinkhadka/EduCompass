const SearchAnalytics = require("../Model/SearchAnalyticsModel");

// =========================================================
// TRACK SEARCH (Middleware for GET /search)
// =========================================================
exports.trackSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") return next();

    await SearchAnalytics.create({
      query: q.trim(),
      userId: req.user?._id || null,
      timestamp: new Date(),
    });
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
    const { category, startDate, endDate, limit = 100, page = 1 } = req.query;

    const filters = {};

    if (category) filters.category = category;

    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const total = await SearchAnalytics.countDocuments(filters);

    const data = await SearchAnalytics.find(filters)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get analytics error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET POPULAR SEARCHES
// =========================================================
exports.getPopularSearches = async (req, res) => {
  try {
    const { category, days = 30, limit = 10 } = req.query;

    const date = new Date();
    date.setDate(date.getDate() - Number(days));

    const match = { timestamp: { $gte: date } };
    if (category) match.category = category;

    const data = await SearchAnalytics.aggregate([
      { $match: match },
      { $group: { _id: "$query", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Number(limit) },
    ]);

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Popular searches error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SEARCH STATISTICS
// =========================================================
exports.getSearchStatistics = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const date = new Date();
    date.setDate(date.getDate() - Number(days));

    const stats = await SearchAnalytics.aggregate([
      { $match: { timestamp: { $gte: date } } },
      {
        $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          uniqueQueries: { $addToSet: "$query" },
          uniqueUsers: { $addToSet: "$userId" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSearches: stats[0]?.totalSearches || 0,
        uniqueQueries: stats[0]?.uniqueQueries.length || 0,
        uniqueUsers: stats[0]?.uniqueUsers.filter(Boolean).length || 0,
        period: `Last ${days} days`,
      },
    });
  } catch (err) {
    console.error("Search stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET USER SEARCH HISTORY
// =========================================================
exports.getUserSearchHistory = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const total = await SearchAnalytics.countDocuments({ userId: req.user._id });

    const data = await SearchAnalytics.find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("User search history error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
