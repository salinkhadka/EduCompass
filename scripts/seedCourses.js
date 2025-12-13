const University = require("../Model/universityModel");
const Course = require("../Model/CourseModel");
const courses = require("./courses.json");

async function seedCourses() {
  try {
    console.log(`\n📚 Starting to seed ${courses.length} courses...`);
    
    let successCount = 0;
    let skipCount = 0;

    for (const course of courses) {
      // Find university by uniId (string) to get its ObjectId
      const university = await University.findOne({ uniId: course.universityId }); 
      
      if (!university) {
        console.log(`⚠️  University not found for ${course.universityId} - Skipping course: ${course.name}`);
        skipCount++;
        continue;
      }

      // Use the university's _id (ObjectId) for the reference
      const result = await Course.findOneAndUpdate(
        { courseId: course.id }, // Query by courseId
        {
          courseId: course.id,
          universityId: university._id, // Store ObjectId reference
          name: course.name,
          level: course.level,
          field: course.field,
          duration: course.duration,
          tuitionFee: course.tuitionFee,
          overview: course.overview,
          requirements: course.requirements,
        },
        { upsert: true, new: true }
      );

      console.log(`   ✓ ${course.name} (${course.id})`);
      successCount++;
    }

    console.log(`\n✅ Courses seeded: ${successCount} successful, ${skipCount} skipped`);
  } catch (error) {
    console.error("❌ Error seeding courses:", error);
    throw error;
  }
}

module.exports = seedCourses;