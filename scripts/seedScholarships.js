const University = require("../Model/universityModel");
const Course = require("../Model/CourseModel");
const Scholarship = require("../Model/ScholarshipModel");
const scholarships = require("./scholarships.json");

async function seedScholarships() {
  try {
    console.log(`\n🎓 Starting to seed ${scholarships.length} scholarships...`);
    
    let successCount = 0;

    for (const sch of scholarships) {
      let universityObjectId = null;

      // If scholarship is linked to a university, get its ObjectId
      if (sch.universityId) {
        const uni = await University.findOne({ uniId: sch.universityId });
        if (uni) {
          universityObjectId = uni._id;
          console.log(`   🔗 Linked to university: ${uni.name}`);
        } else {
          console.log(`   ⚠️  University not found (${sch.universityId}) for scholarship: ${sch.name}`);
        }
      }

      // If scholarship is linked to courses, get their ObjectIds
      let courseObjectIds = [];
      if (sch.courseIds && sch.courseIds.length > 0) {
        const foundCourses = await Course.find({
          courseId: { $in: sch.courseIds },
        }).select("_id name");
        courseObjectIds = foundCourses.map(c => c._id);
        
        if (foundCourses.length > 0) {
          console.log(`   🔗 Linked to ${foundCourses.length} courses`);
        }
      }

      // Upsert the scholarship
      const result = await Scholarship.findOneAndUpdate(
        { scholarshipId: sch.id }, // Query by scholarshipId
        {
          scholarshipId: sch.id,
          name: sch.name,
          provider: sch.provider,
          amount: sch.amount,
          deadline: sch.deadline,
          overview: sch.overview,
          eligibility: sch.eligibility,
          universityId: universityObjectId, // Store ObjectId or null
          courseIds: courseObjectIds, // Store array of ObjectIds
          logo: sch.logo,
        },
        { upsert: true, new: true }
      );

      console.log(`   ✓ ${sch.name}`);
      successCount++;
    }

    console.log(`\n✅ Scholarships seeded: ${successCount} successful`);
  } catch (error) {
    console.error("❌ Error seeding scholarships:", error);
    throw error;
  }
}

module.exports = seedScholarships;