const University = require("../Model/universityModel");
const Course = require("../Model/CourseModel");
const getPagination = require("../utils/pagination");
// CREATE UNIVERSITY (Admin)
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

// GET ALL UNIVERSITIES
exports.getAllUniversities = async (req, res) => {
    try {
        const unis = await University.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: unis,
        });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET SINGLE UNIVERSITY
exports.getUniversityById = async (req, res) => {
    try {
        const uni = await University.findById(req.params.id);

        if (!uni)
            return res.status(404).json({ success: false, message: "Not found" });

        res.status(200).json({ success: true, data: uni });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// UPDATE UNIVERSITY (Admin)
exports.updateUniversity = async (req, res) => {
    try {
        const data = req.body;

        if (req.file) data.logo = req.file.filename;

        const updated = await University.findByIdAndUpdate(req.params.id, data, {
            new: true,
        });

        res.status(200).json({
            success: true,
            message: "University updated successfully",
            data: updated,
        });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// DELETE UNIVERSITY (Admin)
exports.deleteUniversity = async (req, res) => {
    try {
        await University.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "University deleted successfully",
        });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
// SEARCH + FILTER + PAGINATION
exports.searchUniversities = async (req, res) => {
    try {
        // query params
        const {
            q, // text query for name, tagline, description
            country,
            city,
            minTuition,
            maxTuition,
            minRanking,
            maxRanking,
            level, // UG / PG
            field, // course field like "Computer Science"
            sort, // e.g., ranking_asc, ranking_desc, tuition_asc, tuition_desc
        } = req.query;

        const { page, limit, skip } = getPagination(req.query);

        const filters = {};

        if (country) filters.country = country;
        if (city) filters.city = city;
        if (minRanking || maxRanking) {
            filters.ranking = {};
            if (minRanking) filters.ranking.$gte = Number(minRanking);
            if (maxRanking) filters.ranking.$lte = Number(maxRanking);
        }
        if (minTuition || maxTuition) {
            filters.$and = [];
            if (minTuition) filters.$and.push({ tuitionMax: { $gte: Number(minTuition) } });
            if (maxTuition) filters.$and.push({ tuitionMin: { $lte: Number(maxTuition) } });
            if (minTuition && maxTuition) {
                // Ensure university range overlaps with search range
                filters.$and.push({
                    $or: [
                        { tuitionMin: { $lte: Number(maxTuition) } },
                        { tuitionMax: { $gte: Number(minTuition) } }
                    ]
                });
            }
        }

        // Text search
        if (q) {
            filters.$text = { $search: q };
            // ensure a text index exists on University model (see below)
        }

        // If level or field provided, first find matching universityIds via Course collection
        let universityIdsFromCourses = null;
        if (level || field) {
            const courseFilter = {};
            if (level) courseFilter.level = level;
            if (field) courseFilter.field = { $regex: field, $options: "i" };

            const courses = await Course.find(courseFilter).select("universityId").lean();
            const set = new Set(courses.map((c) => String(c.universityId)));
            universityIdsFromCourses = Array.from(set);
            if (universityIdsFromCourses.length === 0) {
                // no matching courses -> return empty
                return res.status(200).json({ success: true, data: [], meta: { total: 0, page, limit } });
            }
            filters._id = { $in: universityIdsFromCourses };
        }

        // Sorting
        let sortObj = { createdAt: -1 };
        if (sort) {
            if (sort === "ranking_asc") sortObj = { ranking: 1 };
            if (sort === "ranking_desc") sortObj = { ranking: -1 };
            if (sort === "tuition_asc") sortObj = { tuitionMin: 1 };
            if (sort === "tuition_desc") sortObj = { tuitionMax: -1 };
        }

        // Count
        const total = await University.countDocuments(filters);
        const totalPages = Math.ceil(total / limit);

        const data = await University.find(filters)
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean();

        res.status(200).json({
            success: true,
            data,
            meta: { total, page, limit, totalPages },
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// SIMILAR UNIVERSITIES
exports.getSimilarUniversities = async (req, res) => {
    try {
        const { id } = req.params;
        const base = await University.findById(id).lean();
        if (!base) return res.status(404).json({ success: false, message: "University not found" });

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
                            // same country (10)
                            { $cond: [{ $eq: ["$country", base.country] }, 10, 0] },
                            // ranking proximity (higher if close)
                            {
                                $cond: [
                                    { $and: [{ $gt: ["$ranking", 0] }, { $gt: [base.ranking || 0, 0] }] },
                                    { $max: [0, { $subtract: [20, { $abs: { $subtract: ["$ranking", base.ranking || 0] } }] }] },
                                    0,
                                ],
                            },
                            // tuition overlap (5)
                            {
                                $cond: [
                                    { $and: [{ $gt: ["$tuitionMin", 0] }, { $gt: [base.tuitionMax || 0, 0] }] },
                                    { $cond: [{ $lte: ["$tuitionMin", base.tuitionMax || 0] }, 5, 0] },
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
            // boost those that are in ids by bringing them to top
            similar = similar.sort((a, b) => {
                const ia = ids.includes(String(a._id)) ? 1 : 0;
                const ib = ids.includes(String(b._id)) ? 1 : 0;
                return ib - ia || b.score - a.score;
            });
        }

        res.status(200).json({ success: true, data: similar });
    } catch (err) {
        console.error("Similar error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

