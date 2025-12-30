const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // =========================
    // AUTH FIELDS
    // =========================
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false, // Google users don't need password
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // =========================
    // PROFILE
    // =========================
    profilePhoto: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      enum: ["normal", "admin"],
      default: "normal",
    },

    preferredCountry: {
      type: String,
      default: "",
      trim: true,
    },
    degreeLevel: {
      type: String,
      enum: ["", "Undergraduate", "Masters", "PhD", "Diploma", "Certificate"],
      default: "",
    },
    studentStatus: {
      type: String,
      enum: [
        "",
        "Planning 2025",
        "Planning 2026",
        "Planning 2027",
        "Researching",
        "Applying",
        "Enrolled",
      ],
      default: "",
    },
    fieldOfStudy: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================
    // SAVED UNIVERSITIES
    // =========================
    savedUniversities: [
      {
        universityId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "University",
          required: true,
        },
        universityName: String,
        country: String,
        program: String,
        savedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =========================
    // SAVED SCHOLARSHIPS
    // =========================
    savedScholarships: [
      {
        scholarshipId: {
          type: String, // External or internal ID
          required: true,
        },
        scholarshipName: String,
        provider: String,
        amount: String,
        deadline: Date,
        savedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // =========================
    // PASSWORD RESET
    // =========================
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // =========================
    // ACTIVITY & STATUS
    // =========================
    recentSearches: [
      {
        query: String,
        category: {
          type: String,
          enum: ["university", "scholarship", "program"],
        },
        searchedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

// =========================
// VIRTUALS
// =========================
userSchema.virtual("savedUniversitiesCount").get(function () {
  return this.savedUniversities.length;
});

userSchema.virtual("savedScholarshipsCount").get(function () {
  return this.savedScholarships.length;
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

// =========================
// EXPORT
// =========================
module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
