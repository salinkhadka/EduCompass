const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
    },
    name: { type: String, required: true },

    level: {
      type: String,
      enum: ["UG", "PG", "PhD"],
      required: true,
    },

    field: { type: String, required: true }, // Business, IT, etc.

    duration: String,
    tuitionFee: Number,
    overview: String,
    requirements: [String],
  },
  { timestamps: true }
);
courseSchema.index({ universityId: 1, level: 1, field: 1 });
courseSchema.index({ tuitionFee: 1 });
module.exports = mongoose.model("Course", courseSchema);
