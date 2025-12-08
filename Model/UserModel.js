const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      enum: ['normal', 'admin' ],
      default: 'normal',
    },
    preferredCountry: {
      type: String,
      default: '',
      trim: true,
    },
    degreeLevel: {
      type: String,
      enum: ['', 'Undergraduate', 'Masters', 'PhD', 'Diploma', 'Certificate'],
      default: '',
    },
    studentStatus: {
      type: String,
      enum: ['', 'Planning 2025', 'Planning 2026', 'Planning 2027', 'Researching', 'Applying', 'Enrolled'],
      default: '',
    },
    fieldOfStudy: {
      type: String,
      default: '',
      trim: true,
    },
    savedUniversities: [{
      universityId: String,
      universityName: String,
      country: String,
      program: String,
      savedAt: { type: Date, default: Date.now },
    }],
    savedScholarships: [{
      scholarshipId: String,
      scholarshipName: String,
      provider: String,
      amount: String,
      deadline: Date,
      savedAt: { type: Date, default: Date.now },
    }],
    
    // Recent Activity
    recentSearches: [{
      query: String,
      category: String, // 'university', 'scholarship', 'program'
      searchedAt: { type: Date, default: Date.now },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });


userSchema.virtual('savedUniversitiesCount').get(function() {
  return this.savedUniversities.length;
});

userSchema.virtual('savedScholarshipsCount').get(function() {
  return this.savedScholarships.length;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);