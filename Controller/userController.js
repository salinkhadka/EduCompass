require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../Model/UserModel");
const mongoose = require("mongoose");

// =========================================================
// REGISTER USER
// =========================================================
exports.registerUser = async (req, res) => {
  const {
    username,
    email,
    password,
    phone,
    preferredCountry,
    degreeLevel,
    studentStatus,
    fieldOfStudy,
  } = req.body;

  try {
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser)
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      phone: phone || "",
      preferredCountry: preferredCountry || "",
      degreeLevel: degreeLevel || "",
      studentStatus: studentStatus || "",
      fieldOfStudy: fieldOfStudy || "",
      profilePhoto: req.file?.filename || "",
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// LOGIN USER
// =========================================================
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password)
      return res.status(400).json({
        success: false,
        message: "Missing email or password",
      });

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(403).json({ success: false, message: "Invalid credentials" });

    const userObj = user.toObject();
    delete userObj.password;

    const payload = {
      _id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "7d" });

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: userObj,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET PROFILE
// =========================================================
exports.getProfile = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(req.user._id).select("-password").lean();

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: user,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// UPDATE PROFILE
// =========================================================
exports.updateProfile = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const {
      username,
      phone,
      preferredCountry,
      degreeLevel,
      studentStatus,
      fieldOfStudy,
    } = req.body;

    const updateFields = {};
    if (username) updateFields.username = username.trim();
    if (phone !== undefined) updateFields.phone = phone;
    if (preferredCountry !== undefined) updateFields.preferredCountry = preferredCountry;
    if (degreeLevel !== undefined) updateFields.degreeLevel = degreeLevel;
    if (studentStatus !== undefined) updateFields.studentStatus = studentStatus;
    if (fieldOfStudy !== undefined) updateFields.fieldOfStudy = fieldOfStudy;
    if (req.file) updateFields.profilePhoto = req.file.filename;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// SAVE UNIVERSITY
// =========================================================
exports.saveUniversity = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { universityId } = req.body;
    if (!universityId) {
      return res.status(400).json({ success: false, message: "University ID missing" });
    }

    const user = await User.findById(req.user._id);
    // ✅ Convert ObjectId to string for comparison
    const exists = user.savedUniversities.some(
      (u) => u.universityId.toString() === universityId
    );

    if (exists)
      return res.status(400).json({ success: false, message: "University already saved" });

    const uni = await University.findById(universityId);
    if (!uni) return res.status(404).json({ success: false, message: "University not found" });

    user.savedUniversities.push({
      universityId,
      universityName: uni.name,
      country: uni.country || "",
      program: uni.programs?.[0] || ""
    });

    await user.save();

    res.status(200).json({ success: true, message: "University saved", data: user.savedUniversities });
  } catch (err) {
    console.error("Save university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// =========================================================
// SAVE SCHOLARSHIP
// =========================================================
exports.saveScholarship = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { scholarshipId, scholarshipName, provider, amount, deadline } = req.body;

    if (!scholarshipId || !scholarshipName) {
      return res.status(400).json({
        success: false,
        message: "Missing scholarship fields",
      });
    }

    const user = await User.findById(req.user._id);

    const exists = user.savedScholarships.some(
      (s) => s.scholarshipId === scholarshipId
    );

    if (exists)
      return res.status(400).json({
        success: false,
        message: "Scholarship already saved",
      });

    user.savedScholarships.push({
      scholarshipId,
      scholarshipName,
      provider: provider || "",
      amount: amount || "",
      deadline: deadline || null,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Scholarship saved",
      data: user.savedScholarships,
    });
  } catch (err) {
    console.error("Save scholarship error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SAVED UNIVERSITIES
// =========================================================
exports.getSavedUniversities = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(req.user._id).select("savedUniversities").lean();

    res.status(200).json({
      success: true,
      data: user.savedUniversities || [],
    });
  } catch (err) {
    console.error("Get saved universities error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SAVED SCHOLARSHIPS
// =========================================================
exports.getSavedScholarships = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(req.user._id).select("savedScholarships").lean();

    res.status(200).json({
      success: true,
      data: user.savedScholarships || [],
    });
  } catch (err) {
    console.error("Get saved scholarships error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// REMOVE SAVED UNIVERSITY
// =========================================================
exports.removeSavedUniversity = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { universityId } = req.params;

    const user = await User.findById(req.user._id);

    const initialLength = user.savedUniversities.length;
    user.savedUniversities = user.savedUniversities.filter(
      (u) => u.universityId !== universityId
    );

    if (user.savedUniversities.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "University not found in saved list",
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "University removed",
      data: user.savedUniversities,
    });
  } catch (err) {
    console.error("Remove university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// REMOVE SAVED SCHOLARSHIP
// =========================================================
exports.removeSavedScholarship = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { scholarshipId } = req.params;

    const user = await User.findById(req.user._id);

    const initialLength = user.savedScholarships.length;
    user.savedScholarships = user.savedScholarships.filter(
      (s) => s.scholarshipId !== scholarshipId
    );

    if (user.savedScholarships.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found in saved list",
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Scholarship removed",
      data: user.savedScholarships,
    });
  } catch (err) {
    console.error("Remove scholarship error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET RECENT SEARCHES
// =========================================================
exports.getRecentSearches = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await User.findById(req.user._id)
      .select("recentSearches")
      .lean();

    const searches = user.recentSearches || [];

    // Return last 10 searches, most recent first
    const recentSearches = searches
      .sort((a, b) => new Date(b.searchedAt) - new Date(a.searchedAt))
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: recentSearches,
    });
  } catch (err) {
    console.error("Get recent searches error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};