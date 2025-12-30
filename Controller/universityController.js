const University = require("../Model/universityModel");
const getPagination = require("../utils/pagination");

// =========================================================
// CREATE UNIVERSITY (Admin)
// =========================================================
exports.createUniversity = async (req, res) => {
  try {
    const university = await University.create(req.body);
    
    res.status(201).json({
      success: true,
      message: "University created",
      data: university,
    });
  } catch (err) {
    console.error("Create university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET ALL UNIVERSITIES (with pagination)
// =========================================================
exports.getAllUniversities = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    
    const total = await University.countDocuments();
    const data = await University.find()
      .skip(skip)
      .limit(limit)
      .sort({ ranking: 1 })
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
    console.error("Get all universities error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET UNIVERSITY BY ID
// =========================================================
exports.getUniversityById = async (req, res) => {
  try {
    const university = await University.findById(req.params.id).lean();

    if (!university)
      return res.status(404).json({
        success: false,
        message: "University not found",
      });

    res.status(200).json({
      success: true,
      data: university,
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
    const updated = await University.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({
        success: false,
        message: "University not found",
      });

    res.status(200).json({
      success: true,
      message: "University updated",
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
      message: "University deleted",
    });
  } catch (err) {
    console.error("Delete university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// SEARCH UNIVERSITIES (with advanced filters)
// =========================================================
exports.searchUniversities = async (req, res) => {
  try {
    const {
      q, // Single search query - searches name, country, city, uniId
      country, // Country code (us, uk, ca, au, jp) - from uniId
      type, // Public/Private
      minTuition, // Minimum tuition
      maxTuition, // Maximum tuition
      minRanking, // Minimum ranking (lower number = better)
      maxRanking, // Maximum ranking
      minAcceptance, // Minimum acceptance rate
      maxAcceptance, // Maximum acceptance rate
      minInternational, // Minimum international student %
      maxInternational, // Maximum international student %
      sort, // ranking, tuition_asc, tuition_desc
    } = req.query;

    const { page, limit, skip } = getPagination(req.query);

    const filters = {};

    // ============================================
    // 1. SINGLE SEARCH BAR
    // Searches: name, country (field), city, and uniId pattern
    // ============================================
    if (q && q.trim()) {
      const searchTerm = q.trim();
      filters.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { country: { $regex: searchTerm, $options: "i" } },
        { city: { $regex: searchTerm, $options: "i" } },
        { uniId: { $regex: searchTerm, $options: "i" } }
      ];
    }

    // ============================================
    // 2. COUNTRY FILTER (from uniId)
    // Format: uni_{country}_{number}
    // Example: uni_us_001, uni_uk_002, uni_jp_003
    // ============================================
    if (country && country.trim()) {
      const countryLower = country.toLowerCase().trim();
      filters.uniId = { 
        $regex: `_${countryLower}_`, 
        $options: "i" 
      };
    }

    // ============================================
    // 3. TYPE FILTER (Public/Private)
    // ============================================
    if (type && type.trim()) {
      filters.type = type;
    }

    // ============================================
    // 4. TUITION RANGE FILTER
    // Check if university's tuition range overlaps with search range
    // ============================================
    if (minTuition || maxTuition) {
      const tuitionFilters = [];
      
      if (minTuition) {
        // University's max tuition should be >= search min
        tuitionFilters.push({ tuitionMax: { $gte: parseInt(minTuition) } });
      }
      
      if (maxTuition) {
        // University's min tuition should be <= search max
        tuitionFilters.push({ tuitionMin: { $lte: parseInt(maxTuition) } });
      }
      
      if (tuitionFilters.length > 0) {
        filters.$and = filters.$and || [];
        filters.$and.push(...tuitionFilters);
      }
    }

    // ============================================
    // 5. RANKING RANGE FILTER
    // Lower number = better ranking
    // ============================================
    if (minRanking || maxRanking) {
      filters.ranking = {};
      if (minRanking) filters.ranking.$gte = parseInt(minRanking);
      if (maxRanking) filters.ranking.$lte = parseInt(maxRanking);
    }

    // ============================================
    // 6. ACCEPTANCE RATE RANGE
    // ============================================
    if (minAcceptance || maxAcceptance) {
      filters.acceptanceRate = {};
      if (minAcceptance) filters.acceptanceRate.$gte = parseInt(minAcceptance);
      if (maxAcceptance) filters.acceptanceRate.$lte = parseInt(maxAcceptance);
    }

    // ============================================
    // 7. INTERNATIONAL STUDENTS % RANGE
    // ============================================
    if (minInternational || maxInternational) {
      filters.internationalStudentsPercentage = {};
      if (minInternational) {
        filters.internationalStudentsPercentage.$gte = parseInt(minInternational);
      }
      if (maxInternational) {
        filters.internationalStudentsPercentage.$lte = parseInt(maxInternational);
      }
    }

    // ============================================
    // 8. SORTING
    // ============================================
    let sortObj = { ranking: 1 }; // Default: best ranking first
    
    if (sort === "tuition_asc") {
      sortObj = { tuitionMin: 1 };
    } else if (sort === "tuition_desc") {
      sortObj = { tuitionMax: -1 };
    } else if (sort === "ranking") {
      sortObj = { ranking: 1 };
    } else if (sort === "name_asc") {
      sortObj = { name: 1 };
    } else if (sort === "name_desc") {
      sortObj = { name: -1 };
    }

    // ============================================
    // 9. FETCH UNIVERSITIES
    // ============================================
    const total = await University.countDocuments(filters);
    const universities = await University.find(filters)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: universities,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Search universities error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET UNIVERSITIES BY COUNTRY
// =========================================================
exports.getUniversitiesByCountry = async (req, res) => {
  try {
    const { country } = req.params;

    const universities = await University.find({ country })
      .sort({ ranking: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: universities,
    });
  } catch (err) {
    console.error("Get universities by country error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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