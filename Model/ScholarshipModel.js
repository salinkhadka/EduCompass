const mongoose = require("mongoose");

const scholarshipSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    provider: { type: String, required: true },
    amount: String,
    deadline: String,
    overview: String,
    eligibility: [String],

    // OPTIONAL: link to specific university
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      default: null,
    },
     courseIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        
      },
    ],

    logo: String,
  },
  { timestamps: true }
);
scholarshipSchema.index({ provider: 1 });
scholarshipSchema.index({ deadline: 1 });
module.exports = mongoose.model("Scholarship", scholarshipSchema);
