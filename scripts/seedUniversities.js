const University = require("../Model/universityModel");
const universities = require("./universities.json");

async function seedUniversities() {
  try {
    for (const uni of universities) {
      await University.findOneAndUpdate(
        { uniId: uni.id }, // Query by uniId
        { 
          uniId: uni.id,
          name: uni.name,
          tagline: uni.tagline,
          description: uni.description,
          logo: uni.logo,
          type: uni.type,
          website: uni.website,
          country: uni.country,
          city: uni.city,
          acceptanceRate: uni.acceptanceRate,
          ranking: uni.ranking,
          totalStudents: uni.totalStudents,
          internationalStudentsPercentage: uni.internationalStudentsPercentage,
          tuitionMin: uni.tuitionMin,
          tuitionMax: uni.tuitionMax,
          livingCostMin: uni.livingCostMin,
          livingCostMax: uni.livingCostMax,
          academicRequirements: uni.academicRequirements,
          languageRequirements: uni.languageRequirements,
          otherRequirements: uni.otherRequirements,
          majorIntakes: uni.majorIntakes,
          applicationDeadlines: uni.applicationDeadlines,
        },
        { upsert: true, new: true }
      );
    }

    console.log("✅ Universities seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding universities:", error);
    throw error;
  }
}

module.exports = seedUniversities;