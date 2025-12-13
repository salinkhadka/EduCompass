require("dotenv").config();
const mongoose = require("mongoose");
const seedUniversities = require("./scripts/seedUniversities");
const seedCourses = require("./scripts/seedCourses");
const seedScholarships = require("./scripts/seedScholarships");

async function seedDatabase() {
  try {
    // Connect to MongoDB
    console.log("MONGO_URI:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Seed in order (universities first, then courses, then scholarships)
    await seedUniversities();
    await seedCourses();
    await seedScholarships();

    console.log("\n🎉 All data seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedDatabase();