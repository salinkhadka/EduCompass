require('dotenv').config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../Model/userModel");
const emailService = require("../utils/emailService");

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

    // Send welcome email (optional - don't block registration if it fails)
    try {
      await emailService.sendWelcomeEmail(cleanEmail, cleanUsername);
    } catch (emailError) {
      console.error("Welcome email failed:", emailError);
    }

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
exports.findOrCreateGoogleUser = async (googleId, email, name) => {
  try {
    // First, try to find user by googleId
    let user = await User.findOne({ googleId });

    if (user) {
      return user;
    }

    // If not found by googleId, check if user exists with this email
    user = await User.findOne({ email });

    if (user) {
      // User exists with email but not linked to Google - link it
      user.googleId = googleId;
      if (!user.username) {
        user.username = name || email.split('@')[0];
      }
      await user.save();
      return user;
    }

    // Create new user
    const username = name || email.split('@')[0];
    user = await User.create({
      email,
      username,
      googleId,
      isVerified: true, // Google emails are already verified
      // No password needed for Google users
    });

    return user;
  } catch (error) {
    console.error("Error in findOrCreateGoogleUser:", error);
    throw error;
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
// CHANGE PASSWORD
// =========================================================
exports.changePassword = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Check if new password is same as current
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Send email notification
    try {
      await emailService.sendPasswordChangeEmail(user.email, user.username);
    } catch (emailError) {
      console.error("Password change email failed:", emailError);
      // Don't fail the password change if email fails
    }

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// FORGOT PASSWORD - Send reset token
// =========================================================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email exists, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token and expiry to user
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);
    } catch (emailError) {
      console.error("Reset email failed:", emailError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: "Error sending reset email. Please try again later.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// VERIFY RESET TOKEN
// =========================================================
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Verify reset token error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// RESET PASSWORD - Complete password reset
// =========================================================
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await emailService.sendPasswordChangeEmail(user.email, user.username);
    } catch (emailError) {
      console.error("Password reset email failed:", emailError);
    }

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// SAVE UNIVERSITY
// =========================================================
exports.saveUniversity = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - Please login" 
      });
    }

    const { universityId } = req.body;
    
    if (!universityId) {
      return res.status(400).json({ 
        success: false, 
        message: "University ID missing" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid university ID format" 
      });
    }

    const University = mongoose.model("University");
    
    const uni = await University.findById(universityId);
    if (!uni) {
      return res.status(404).json({ 
        success: false, 
        message: "University not found" 
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const exists = user.savedUniversities.some(
      (u) => u.universityId.toString() === universityId.toString()
    );

    if (exists) {
      return res.status(400).json({ 
        success: false, 
        message: "University already saved" 
      });
    }

    user.savedUniversities.push({
      universityId: uni._id,
      universityName: uni.name,
      country: uni.country || "",
      program: ""
    });

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "University saved successfully",
      data: user.savedUniversities 
    });

  } catch (err) {
    console.error("Save university error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: err.message
    });
  }
};

// =========================================================
// REMOVE SAVED UNIVERSITY
// =========================================================
exports.removeSavedUniversity = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - Please login" 
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "University ID missing" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid university ID format" 
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const initialLength = user.savedUniversities.length;
    user.savedUniversities = user.savedUniversities.filter(
      (u) => u.universityId.toString() !== id.toString()
    );

    if (user.savedUniversities.length === initialLength) {
      return res.status(404).json({ 
        success: false, 
        message: "University not found in saved list" 
      });
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "University removed from saved list",
      data: user.savedUniversities 
    });

  } catch (err) {
    console.error("Remove saved university error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: err.message
    });
  }
};

// =========================================================
// GET SAVED UNIVERSITIES
// =========================================================
exports.getSavedUniversities = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - Please login" 
      });
    }

    const user = await User.findById(req.user._id).populate('savedUniversities.universityId');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: user.savedUniversities 
    });

  } catch (err) {
    console.error("Get saved universities error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: err.message
    });
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
// =========================================================
// ADMIN DELETE USER
// =========================================================
exports.adminDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Admin delete user error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
