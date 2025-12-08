require('dotenv').config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../Model/UserModel");
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');


exports.registerUser = async (req, res) => {
  const { username, email, password, phone, preferredCountry, degreeLevel, studentStatus, fieldOfStudy } = req.body;

  try {
    if (!email || !password || !username) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      phone: phone || "",
      preferredCountry: preferredCountry || "",
      degreeLevel: degreeLevel || "",
      studentStatus: studentStatus || "",
      fieldOfStudy: fieldOfStudy || "",
      profilePhoto: req.file?.filename || "",
    });

    await newUser.save();

    return res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(403).json({ success: false, message: "Invalid credentials" });

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
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Profile fetched successfully",
    data: req.user,
  });
};
exports.updateProfile = async (req, res) => {
  try {
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

    const updated = await User.findByIdAndUpdate(req.user._id, updateFields, { new: true });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.saveUniversity = async (req, res) => {
  try {
    const { universityId, universityName, country, program } = req.body;

    const user = await User.findById(req.user._id);

    user.savedUniversities.push({
      universityId,
      universityName,
      country,
      program,
    });

    await user.save();

    res.status(200).json({ success: true, message: "University saved" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.saveScholarship = async (req, res) => {
  try {
    const { scholarshipId, scholarshipName, provider, amount, deadline } = req.body;

    const user = await User.findById(req.user._id);

    user.savedScholarships.push({
      scholarshipId,
      scholarshipName,
      provider,
      amount,
      deadline,
    });

    await user.save();

    res.status(200).json({ success: true, message: "Scholarship saved" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.getSavedUniversities = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user.savedUniversities,
  });
};
exports.getSavedScholarships = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user.savedScholarships,
  });
};
