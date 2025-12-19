const University = require("../Model/universityModel");
const Course = require("../Model/CourseModel");
const getPagination = require("../utils/pagination");
const { trackSearch } = require("../Controller/analyticsController");

// =========================================================
// CREATE UNIVERSITY (Admin)
// =========================================================
exports.createUniversity = async (req, res) => {
  try {
    const data = req.body;
    if (req.file) data.logo = req.file.filename;

    const uni = await University.create(data);

    res.status(201).json({
      success: true,
      message: "University created successfully",
      data: uni,
    });
  } catch (err) {
    console.error("Create University Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET ALL UNIVERSITIES
// =========================================================
exports.getAllUniversities = async (req, res) => {
  try {
    const unis = await University.find().sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: unis,
    });
  } catch (err) {
    console.error("Get all universities error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SINGLE UNIVERSITY
// =========================================================
exports.getUniversityById = async (req, res) => {
  try {
    const uni = await University.findById(req.params.id).lean();

    if (!uni)
      return res.status(404).json({
        success: false,
        message: "University not found",
      });

    res.status(200).json({
      success: true,
      data: uni,
    });
  } catch (err) {
    console.error("Get university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// UPDATE UNIVERSITY (Admin)
// =========================================================
exports.updateUniversity = async (req, res) => {
  try {
    const data = req.body;
    if (req.file) data.logo = req.file.filename;

    const updated = await University.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    if (!updated)
      return res.status(404).json({
        success: false,
        message: "University not found",
      });

    res.status(200).json({
      success: true,
      message: "University updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// DELETE UNIVERSITY (Admin)
// =========================================================
exports.deleteUniversity = async (req, res) => {
  try {
    const deleted = await University.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({
        success: false,
        message: "University not found",
      });

    res.status(200).json({
      success: true,
      message: "University deleted successfully",
    });
  } catch (err) {
    console.error("Delete university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// SEARCH + FILTER + PAGINATION (with Analytics)
// =========================================================
exports.searchUniversities = async (req, res) => {
  try {
    const { page = 1, limit = 20, q = "", country, city, minTuition, maxTuition, level, field, sort } = req.query;

    const filter = {};

    // Text search on name, country, city
    if (q) {
      // Create regex for exact substring match
      const regex = new RegExp(q, "i"); // i = case-insensitive
      filter.$or = [
        { name: { $regex: regex } },
        { country: { $regex: regex } },
        { city: { $regex: regex } },
      ];
    }

    // Country & city filters
    if (country) filter.country = country;
    if (city) filter.city = city;

    // Tuition filter
    if (minTuition || maxTuition) {
      filter.$and = [];
      if (minTuition) filter.$and.push({ tuitionMax: { $gte: Number(minTuition) } });
      if (maxTuition) filter.$and.push({ tuitionMin: { $lte: Number(maxTuition) } });
    }

    // Course level / field filter
    if (level || field) {
      const courseFilter = {};
      if (level) courseFilter.level = level;
      if (field) courseFilter.field = { $regex: field, $options: 'i' };
      const courses = await Course.find(courseFilter).select('universityId').lean();
      const universityIdsFromCourses = courses.map(c => c.universityId.toString());
      if (universityIdsFromCourses.length === 0) {
        return res.status(200).json({ success: true, data: [], meta: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } });
      }
      filter._id = { $in: universityIdsFromCourses };
    }

    // Sorting
    let sortObj = { createdAt: -1 };
    if (sort) {
      if (sort === 'ranking') sortObj = { ranking: 1 };
      else if (sort === 'ranking_desc') sortObj = { ranking: -1 };
      else if (sort === 'tuition_asc') sortObj = { tuitionMin: 1 };
      else if (sort === 'tuition_desc') sortObj = { tuitionMax: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await University.countDocuments(filter);
    const data = await University.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).lean();

    return res.status(200).json({
      success: true,
      message: "Universities fetched",
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};





// =========================================================
// SIMILAR UNIVERSITIES
// =========================================================
exports.getSimilarUniversities = async (req, res) => {
  try {
    const { id } = req.params;
    const base = await University.findById(id).lean();
    
    if (!base)
      return res.status(404).json({
        success: false,
        message: "University not found",
      });

    // Get top fields from the university's courses
    const courses = await Course.find({ universityId: base._id }).lean();
    const fields = courses.map((c) => c.field).filter(Boolean);

    // Build scoring: same country + same field + ranking proximity + tuition overlap
    const pipeline = [
      { $match: { _id: { $ne: base._id } } },
      {
        $addFields: {
          score: {
            $add: [
              { $cond: [{ $eq: ["$country", base.country] }, 10, 0] },
              {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$ranking", 0] },
                      { $gt: [base.ranking || 0, 0] },
                    ],
                  },
                  {
                    $max: [
                      0,
                      {
                        $subtract: [
                          20,
                          { $abs: { $subtract: ["$ranking", base.ranking || 0] } },
                        ],
                      },
                    ],
                  },
                  0,
                ],
              },
              {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$tuitionMin", 0] },
                      { $gt: [base.tuitionMax || 0, 0] },
                    ],
                  },
                  {
                    $cond: [
                      { $lte: ["$tuitionMin", base.tuitionMax || 0] },
                      5,
                      0,
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 10 },
    ];

    let similar = await University.aggregate(pipeline);

    // Boost ones that share course fields
    if (fields.length > 0) {
      const fieldMatch = await Course.aggregate([
        { $match: { field: { $in: fields } } },
        { $group: { _id: "$universityId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]);

      const ids = fieldMatch.map((f) => String(f._id));
      similar = similar.sort((a, b) => {
        const ia = ids.includes(String(a._id)) ? 1 : 0;
        const ib = ids.includes(String(b._id)) ? 1 : 0;
        return ib - ia || b.score - a.score;
      });
    }

    res.status(200).json({
      success: true,
      data: similar,
    });
  } catch (err) {
    console.error("Similar error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};