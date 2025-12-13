const mongoose = require("mongoose");

const scholarshipSchema = new mongoose.Schema(
  {
    scholarshipId: {
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

    provider: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: String, // "Full tuition", "$5000/year"
    },

    deadline: {
      type: String, // ISO string or readable date
    },

    overview: {
      type: String,
      trim: true,
    },

    eligibility: [String],

    // Optional link to a university (ObjectId reference)
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      default: null,
    },

    // Optional link to specific courses (ObjectId references)
    courseIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    logo: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes
scholarshipSchema.index({ provider: 1 });
scholarshipSchema.index({ deadline: 1 });

// Text search
scholarshipSchema.index({
  name: "text",
  provider: "text",
  overview: "text",
});

module.exports = mongoose.model("Scholarship", scholarshipSchema);