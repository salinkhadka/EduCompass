require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../Model/UserModel");
const nodemailer = require("nodemailer");
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

    const cleanEmail = email.trim();
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
    console.error(err);
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

    const cleanEmail = email.trim();
    const user = await User.findOne({ email: cleanEmail });
    
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(403).json({ success: false, message: "Invalid credentials" });

    // Remove password BEFORE any other operations
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

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: req.user,
    });
  } catch {
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

    const updateFields = {
      ...(username && { username }),
      ...(phone && { phone }),
      ...(preferredCountry && { preferredCountry }),
      ...(degreeLevel && { degreeLevel }),
      ...(studentStatus && { studentStatus }),
      ...(fieldOfStudy && { fieldOfStudy }),
    };

    if (req.file) updateFields.profilePhoto = req.file.filename;

    const updated = await User.findByIdAndUpdate(req.user._id, updateFields, {
      new: true,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error(err);
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

    const { universityId, universityName, country, program } = req.body;

    if (!universityId || !universityName) {
      return res.status(400).json({
        success: false,
        message: "Missing university fields",
      });
    }

    const user = await User.findById(req.user._id);

    const exists = user.savedUniversities.some(
      (u) => u.universityId === universityId
    );

    if (exists)
      return res.status(400).json({
        success: false,
        message: "University already saved",
      });

    user.savedUniversities.push({
      universityId,
      universityName,
      country,
      program,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: "University saved",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// SAVE SCHOLARSHIP
// =========================================================
exports.saveUniversity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { universityId, universityName, country, program } = req.body;

    if (!universityId || !universityName) {
      return res.status(400).json({
        success: false,
        message: "Missing university fields",
      });
    }

    const user = await User.findById(req.user._id).session(session);

    const exists = user.savedUniversities.some(
      (u) => u.universityId === universityId
    );

    if (exists) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "University already saved",
      });
    }

    user.savedUniversities.push({
      universityId,
      universityName,
      country,
      program,
    });

    await user.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "University saved",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Save university error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    session.endSession();
  }
};


// =========================================================
// GET SAVED UNIVERSITIES
// =========================================================
exports.getSavedUniversities = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    res.status(200).json({
      success: true,
      data: req.user.savedUniversities,
    });
  } catch (err) {
    console.error(err);
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

    res.status(200).json({
      success: true,
      data: req.user.savedScholarships,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.removeSavedUniversity = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { universityId } = req.params;

    const user = await User.findById(req.user._id);
    user.savedUniversities = user.savedUniversities.filter(
      (u) => u.universityId !== universityId
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: "University removed",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
