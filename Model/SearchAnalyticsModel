const mongoose = require("mongoose");

const searchAnalyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    
    query: {
      type: String,
      required: true,
      trim: true,
    },
    
    filters: {
      type: Object,
      default: {},
    },
    
    resultCount: {
      type: Number,
      default: 0,
    },
    
    category: {
      type: String,
      enum: ["university", "scholarship", "course"],
      required: true,
      index: true,
    },
    
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for better query performance
searchAnalyticsSchema.index({ category: 1, timestamp: -1 });
searchAnalyticsSchema.index({ userId: 1, timestamp: -1 });
searchAnalyticsSchema.index({ query: 1, category: 1 });

module.exports = mongoose.model("SearchAnalytics", searchAnalyticsSchema);