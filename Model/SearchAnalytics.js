const searchAnalyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  query: { type: String, required: true },
  filters: { type: Object },
  resultCount: { type: Number },
  category: { type: String, enum: ['university', 'scholarship', 'course'] },
  timestamp: { type: Date, default: Date.now },
});

searchAnalyticsSchema.index({ timestamp: -1 });
searchAnalyticsSchema.index({ category: 1 });

module.exports = mongoose.model('SearchAnalytics', searchAnalyticsSchema);
