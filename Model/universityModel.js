const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    tagline: { type: String },
    description: { type: String },
    logo: { type: String }, // multer filename

    type: {
      type: String,
      enum: ["Public", "Private"],
      default: "Public",
    },

    // Location
    country: { type: String, required: true },
    city: { type: String, required: true },

    // Stats
    acceptanceRate: { type: Number },
    ranking: { type: Number },
    totalStudents: { type: Number },
    internationalStudentsPercentage: { type: Number },

    // Tuition
    tuitionMin: Number,
    tuitionMax: Number,
    livingCostMin: Number,
    livingCostMax: Number,

    // Requirements
    academicRequirements: [String],
    languageRequirements: [String],
    otherRequirements: [String],

    // Intakes
    majorIntakes: [String],
    applicationDeadlines: [String],
  },
  { timestamps: true }
);
universitySchema.index({ country: 1, city: 1 });
universitySchema.index({ ranking: 1 });
universitySchema.index({ tuitionMin: 1, tuitionMax: 1 });
// create text index for name, tagline, description
universitySchema.index({ name: "text", tagline: "text", description: "text", city: "text", country: "text" });


module.exports = mongoose.model("University", universitySchema);
