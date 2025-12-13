const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    uniId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    tagline: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    logo: {
      type: String, // multer filename or URL
    },

    type: {
      type: String,
      enum: ["Public", "Private"],
      default: "Public",
    },

    website: {
      type: String,
      trim: true,
    },

    // Location
    country: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    // Stats
    acceptanceRate: {
      type: Number, // %
      min: 0,
      max: 100,
    },

    ranking: {
      type: Number,
      min: 1,
    },

    totalStudents: {
      type: Number,
      min: 0,
    },

    internationalStudentsPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    // Tuition & Living Cost (yearly)
    tuitionMin: Number,
    tuitionMax: Number,
    livingCostMin: Number,
    livingCostMax: Number,

    // Requirements
    academicRequirements: [String],
    languageRequirements: [String],
    otherRequirements: [String],

    // Intakes
    majorIntakes: [String], // Fall, Spring, etc.
    applicationDeadlines: [String],
  },
  { timestamps: true }
);

// Indexes
universitySchema.index({ country: 1, city: 1 });
universitySchema.index({ ranking: 1 });
universitySchema.index({ tuitionMin: 1, tuitionMax: 1 });

// Full-text search
universitySchema.index({
  name: "text",
  tagline: "text",
  description: "text",
  city: "text",
  country: "text",
});

module.exports = mongoose.model("University", universitySchema);