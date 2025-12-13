const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseId: { 
      type: String, 
      unique: true, 
      required: true,
      index: true 
    },

    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
      index: true,
    },

    name: { 
      type: String, 
      required: true, 
      trim: true 
    },

    level: { 
      type: String, 
      enum: ["UG", "PG", "PhD"], 
      required: true 
    },

    field: { 
      type: String, 
      required: true, 
      trim: true 
    },

    duration: String,
    
    tuitionFee: { 
      type: Number, 
      min: 0 
    },
    
    overview: { 
      type: String, 
      trim: true 
    },
    
    requirements: [String],
  },
  { timestamps: true }
);

// Indexes
courseSchema.index({ universityId: 1, level: 1, field: 1 });
courseSchema.index({ tuitionFee: 1 });

// Text search
courseSchema.index({
  name: "text",
  field: "text",
  overview: "text",
});

module.exports = mongoose.model("Course", courseSchema);