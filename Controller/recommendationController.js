const University = require("../Model/universityModel");
const Course = require("../Model/CourseModel");
const Scholarship = require("../Model/ScholarshipModel");
const User = require("../Model/UserModel");

// =========================================================
// GET PERSONALIZED UNIVERSITY RECOMMENDATIONS
// =========================================================
exports.getUniversityRecommendations = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(req.user._id).lean();
    const { limit = 10 } = req.query;

    const filters = {};
    const scoringFactors = [];

    // Filter by preferred country
    if (user.preferredCountry) {
      filters.country = user.preferredCountry;
    }

    // Get universities
    let universities = await University.find(filters).lean();

    // If no results with preferred country, get all
    if (universities.length === 0) {
      universities = await University.find().lean();
    }

    // Score each university
    const scored = universities.map((uni) => {
      let score = 0;

      // Country match (20 points)
      if (user.preferredCountry && uni.country === user.preferredCountry) {
        score += 20;
      }

      // Ranking (up to 15 points - better ranking = higher score)
      if (uni.ranking && uni.ranking > 0) {
        score += Math.max(0, 15 - uni.ranking / 100);
      }

      // Acceptance rate (10 points for reasonable acceptance rate)
      if (uni.acceptanceRate) {
        if (uni.acceptanceRate >= 20 && uni.acceptanceRate <= 70) {
          score += 10;
        } else if (uni.acceptanceRate > 70) {
          score += 5;
        }
      }

      // International student percentage (5 points for diverse campus)
      if (
        uni.internationalStudentsPercentage &&
        uni.internationalStudentsPercentage > 10
      ) {
        score += 5;
      }

      // Has courses matching user's field of study (25 points)
      // This will be checked separately below

      return { ...uni, recommendationScore: score };
    });

    // If user has field of study, boost universities with matching courses
    if (user.fieldOfStudy) {
      const matchingCourses = await Course.find({
        field: { $regex: user.fieldOfStudy, $options: "i" },
      })
        .select("universityId")
        .lean();

      const uniIdsWithField = new Set(
        matchingCourses.map((c) => String(c.universityId))
      );

      scored.forEach((uni) => {
        if (uniIdsWithField.has(String(uni._id))) {
          uni.recommendationScore += 25;
        }
      });
    }

    // Sort by score and limit
    const recommended = scored
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: recommended,
      meta: {
        basedOn: {
          preferredCountry: user.preferredCountry || "Not set",
          fieldOfStudy: user.fieldOfStudy || "Not set",
          degreeLevel: user.degreeLevel || "Not set",
        },
      },
    });
  } catch (err) {
    console.error("Get university recommendations error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET COURSE RECOMMENDATIONS
// =========================================================
exports.getCourseRecommendations = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(req.user._id).lean();
    const { limit = 10 } = req.query;

    const filters = {};

    // Filter by degree level
    if (user.degreeLevel) {
      const levelMap = {
        Undergraduate: "UG",
        Masters: "PG",
        PhD: "PhD",
      };
      if (levelMap[user.degreeLevel]) {
        filters.level = levelMap[user.degreeLevel];
      }
    }

    // Filter by field of study
    if (user.fieldOfStudy) {
      filters.field = { $regex: user.fieldOfStudy, $options: "i" };
    }

    let courses = await Course.find(filters)
      .populate("universityId", "name country city logo ranking")
      .limit(parseInt(limit))
      .lean();

    // If user has saved universities, prioritize courses from those universities
    if (user.savedUniversities && user.savedUniversities.length > 0) {
      const savedUniIds = user.savedUniversities.map((u) => u.universityId);

      courses = courses.sort((a, b) => {
        const aIsSaved = savedUniIds.includes(String(a.universityId?._id));
        const bIsSaved = savedUniIds.includes(String(b.universityId?._id));

        if (aIsSaved && !bIsSaved) return -1;
        if (!aIsSaved && bIsSaved) return 1;

        // If both saved or both not saved, sort by university ranking
        const aRanking = a.universityId?.ranking || 9999;
        const bRanking = b.universityId?.ranking || 9999;
        return aRanking - bRanking;
      });
    }

    res.status(200).json({
      success: true,
      data: courses,
      meta: {
        basedOn: {
          degreeLevel: user.degreeLevel || "Not set",
          fieldOfStudy: user.fieldOfStudy || "Not set",
          savedUniversities: user.savedUniversities?.length || 0,
        },
      },
    });
  } catch (err) {
    console.error("Get course recommendations error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SCHOLARSHIP RECOMMENDATIONS
// =========================================================
exports.getScholarshipRecommendations = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(req.user._id).lean();
    const { limit = 10 } = req.query;

    let scholarships = await Scholarship.find()
      .populate("universityId", "name country city logo")
      .lean();

    // Score scholarships
    const scored = scholarships.map((scholarship) => {
      let score = 0;

      // Linked to saved university (30 points)
      if (
        user.savedUniversities &&
        scholarship.universityId &&
        user.savedUniversities.some(
          (u) => u.universityId === String(scholarship.universityId._id)
        )
      ) {
        score += 30;
      }

      // Country match (20 points)
      if (
        user.preferredCountry &&
        scholarship.universityId?.country === user.preferredCountry
      ) {
        score += 20;
      }

      // Full tuition or high amount (15 points)
      if (
        scholarship.amount &&
        (scholarship.amount.toLowerCase().includes("full") ||
          scholarship.amount.toLowerCase().includes("100%"))
      ) {
        score += 15;
      }

      // Upcoming deadline (10 points if deadline within 90 days)
      if (scholarship.deadline) {
        const deadlineDate = new Date(scholarship.deadline);
        const today = new Date();
        const daysUntilDeadline = Math.ceil(
          (deadlineDate - today) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDeadline > 0 && daysUntilDeadline <= 90) {
          score += 10;
        }
      }

      // Field of study match in eligibility (10 points)
      if (
        user.fieldOfStudy &&
        scholarship.eligibility &&
        scholarship.eligibility.some((e) =>
          e.toLowerCase().includes(user.fieldOfStudy.toLowerCase())
        )
      ) {
        score += 10;
      }

      return { ...scholarship, recommendationScore: score };
    });

    // Sort by score and limit
    const recommended = scored
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: recommended,
      meta: {
        basedOn: {
          preferredCountry: user.preferredCountry || "Not set",
          fieldOfStudy: user.fieldOfStudy || "Not set",
          savedUniversities: user.savedUniversities?.length || 0,
        },
      },
    });
  } catch (err) {
    console.error("Get scholarship recommendations error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET ALL RECOMMENDATIONS (Combined)
// =========================================================
exports.getAllRecommendations = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(req.user._id).lean();

    // Get top 5 of each
    const [universities, courses, scholarships] = await Promise.all([
      getTopUniversities(user, 5),
      getTopCourses(user, 5),
      getTopScholarships(user, 5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        universities,
        courses,
        scholarships,
      },
      meta: {
        userProfile: {
          preferredCountry: user.preferredCountry || "Not set",
          degreeLevel: user.degreeLevel || "Not set",
          fieldOfStudy: user.fieldOfStudy || "Not set",
        },
      },
    });
  } catch (err) {
    console.error("Get all recommendations error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// HELPER FUNCTIONS
// =========================================================

async function getTopUniversities(user, limit) {
  const filters = {};
  if (user.preferredCountry) {
    filters.country = user.preferredCountry;
  }

  let universities = await University.find(filters).limit(limit * 2).lean();

  if (universities.length === 0) {
    universities = await University.find().limit(limit * 2).lean();
  }

  const scored = universities.map((uni) => {
    let score = 0;
    if (user.preferredCountry && uni.country === user.preferredCountry) score += 20;
    if (uni.ranking && uni.ranking > 0) score += Math.max(0, 15 - uni.ranking / 100);
    if (uni.acceptanceRate >= 20 && uni.acceptanceRate <= 70) score += 10;
    return { ...uni, recommendationScore: score };
  });

  return scored
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

async function getTopCourses(user, limit) {
  const filters = {};
  if (user.degreeLevel) {
    const levelMap = { Undergraduate: "UG", Masters: "PG", PhD: "PhD" };
    if (levelMap[user.degreeLevel]) filters.level = levelMap[user.degreeLevel];
  }
  if (user.fieldOfStudy) {
    filters.field = { $regex: user.fieldOfStudy, $options: "i" };
  }

  return await Course.find(filters)
    .populate("universityId", "name country logo ranking")
    .limit(limit)
    .lean();
}

async function getTopScholarships(user, limit) {
  const scholarships = await Scholarship.find()
    .populate("universityId", "name country logo")
    .limit(limit * 2)
    .lean();

  const scored = scholarships.map((s) => {
    let score = 0;
    if (
      user.savedUniversities &&
      s.universityId &&
      user.savedUniversities.some((u) => u.universityId === String(s.universityId._id))
    ) {
      score += 30;
    }
    if (user.preferredCountry && s.universityId?.country === user.preferredCountry) {
      score += 20;
    }
    return { ...s, recommendationScore: score };
  });

  return scored
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}