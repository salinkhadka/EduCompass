const Scholarship = require("../Model/ScholarshipModel");
const getPagination = require("../utils/pagination");
// CREATE SCHOLARSHIP (Admin)
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
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL
// exports.getAllScholarships = async (req, res) => {
//   try {
//     const data = await Scholarship.find();
//     res.status(200).json({ success: true, data });
//   } catch {
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// GET BY ID
exports.getScholarship = async (req, res) => {
  try {
    const data = await Scholarship.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE
exports.updateScholarship = async (req, res) => {
  try {
    const data = req.body;
    if (req.file) data.logo = req.file.filename;

    const updated = await Scholarship.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    res.status(200).json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE
exports.deleteScholarship = async (req, res) => {
  try {
    await Scholarship.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Scholarship deleted" });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.getAllScholarships = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const total = await Scholarship.countDocuments();
    const data = await Scholarship.find().skip(skip).limit(limit).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data, meta: { total, page, limit, totalPages: Math.ceil(total/limit) }});
  } catch { res.status(500).json({ success: false, message: "Server error" }); }
};
