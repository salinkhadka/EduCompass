const University = require("../Model/universityModel");
const Course = require("../Model/CourseModel");
const Scholarship = require("../Model/ScholarshipModel");
const User = require("../Model/userModel");

// =========================================================
// SCORING WEIGHTS (Adjusted: Removed Saved Items Boost)
// =========================================================
const WEIGHTS = {
  COUNTRY_MATCH: 25,
  FIELD_MATCH: 30,
  DEGREE_LEVEL_MATCH: 20,
  // SAVED_UNI_BOOST has been removed
  RANKING_SCORE: 15,
  ACCEPTANCE_RATE: 10,
  TUITION_AFFORDABILITY: 12,
  INTERNATIONAL_DIVERSITY: 8,
  DEADLINE_PROXIMITY: 15,
  SCHOLARSHIP_AMOUNT: 20,
};

// =========================================================
// HELPER: Calculate University Score
// =========================================================
const calculateUniversityScore = (university, user, userFieldCourses = []) => {
  let score = 0;
  const reasons = [];

  // 1. Country Match
  if (user.preferredCountry && university.country === user.preferredCountry) {
    score += WEIGHTS.COUNTRY_MATCH;
    reasons.push(`Matches your preferred country: ${user.preferredCountry}`);
  }

  // 2. Has courses in user's field
  const hasFieldCourses = userFieldCourses.some(
    c => String(c.universityId) === String(university._id)
  );
  if (hasFieldCourses && user.fieldOfStudy) {
    score += WEIGHTS.FIELD_MATCH;
    reasons.push(`Offers programs in ${user.fieldOfStudy}`);
  }

  // 3. Ranking (better ranking = higher score, diminishing returns)
  if (university.ranking && university.ranking > 0) {
    const rankingScore = Math.max(0, WEIGHTS.RANKING_SCORE * (1 - university.ranking / 1000));
    score += rankingScore;
    if (university.ranking <= 100) {
      reasons.push(`Top 100 university (Ranked #${university.ranking})`);
    }
  }

  // 4. Acceptance Rate (sweet spot: 20-70%)
  if (university.acceptanceRate) {
    if (university.acceptanceRate >= 20 && university.acceptanceRate <= 70) {
      score += WEIGHTS.ACCEPTANCE_RATE;
      reasons.push(`Balanced acceptance rate (${university.acceptanceRate}%)`);
    } else if (university.acceptanceRate > 70) {
      score += WEIGHTS.ACCEPTANCE_RATE * 0.5;
    }
  }

  // 5. Tuition Affordability (prefer lower tuition)
  if (university.tuitionMin && university.tuitionMax) {
    const avgTuition = (university.tuitionMin + university.tuitionMax) / 2;
    if (avgTuition < 10000) {
      score += WEIGHTS.TUITION_AFFORDABILITY;
      reasons.push("Affordable tuition fees");
    } else if (avgTuition < 20000) {
      score += WEIGHTS.TUITION_AFFORDABILITY * 0.5;
    }
  }

  // 6. International Student Diversity
  if (university.internationalStudentsPercentage && university.internationalStudentsPercentage > 15) {
    score += WEIGHTS.INTERNATIONAL_DIVERSITY;
    reasons.push("High international student diversity");
  }

  // REMOVED: 7. Similar to saved universities logic

  return { score, reasons };
};

// =========================================================
// HELPER: Calculate Course Score
// =========================================================
const calculateCourseScore = (course, user) => {
  let score = 0;
  const reasons = [];

  // 1. Degree Level Match
  if (user.degreeLevel) {
    const levelMap = {
      Undergraduate: "UG",
      Masters: "PG",
      PhD: "PhD",
    };
    if (course.level === levelMap[user.degreeLevel]) {
      score += WEIGHTS.DEGREE_LEVEL_MATCH;
      reasons.push(`Matches your degree level: ${user.degreeLevel}`);
    }
  }

  // 2. Field of Study Match
  if (user.fieldOfStudy && course.field) {
    const fieldMatch = course.field.toLowerCase().includes(user.fieldOfStudy.toLowerCase());
    if (fieldMatch) {
      score += WEIGHTS.FIELD_MATCH;
      reasons.push(`Matches your field: ${user.fieldOfStudy}`);
    }
  }

  // REMOVED: 3. From saved university logic

  // 4. University ranking bonus
  if (course.universityId?.ranking && course.universityId.ranking <= 200) {
    score += WEIGHTS.RANKING_SCORE * 0.5;
    reasons.push(`From top-ranked university (#${course.universityId.ranking})`);
  }

  // 5. Tuition affordability
  if (course.tuitionFee) {
    if (course.tuitionFee < 15000) {
      score += WEIGHTS.TUITION_AFFORDABILITY;
      reasons.push("Affordable tuition");
    } else if (course.tuitionFee < 25000) {
      score += WEIGHTS.TUITION_AFFORDABILITY * 0.5;
    }
  }

  // 6. Country match
  if (user.preferredCountry && course.universityId?.country === user.preferredCountry) {
    score += WEIGHTS.COUNTRY_MATCH;
    reasons.push(`In your preferred country: ${user.preferredCountry}`);
  }

  return { score, reasons };
};

// =========================================================
// HELPER: Calculate Scholarship Score
// =========================================================
const calculateScholarshipScore = (scholarship, user, userCourses = []) => {
  let score = 0;
  const reasons = [];

  // REMOVED: 1. Linked to saved university logic

  // 2. Country match
  if (user.preferredCountry && scholarship.universityId?.country === user.preferredCountry) {
    score += WEIGHTS.COUNTRY_MATCH;
    reasons.push(`Available in ${user.preferredCountry}`);
  }

  // 3. Amount (full/high scholarships score higher)
  if (scholarship.amount) {
    const amountLower = scholarship.amount.toLowerCase();
    if (amountLower.includes("full") || amountLower.includes("100%")) {
      score += WEIGHTS.SCHOLARSHIP_AMOUNT;
      reasons.push("Full tuition coverage");
    } else if (amountLower.match(/\$[\d,]+/)) {
      const match = amountLower.match(/\$([\d,]+)/);
      if (match) {
        const amount = parseInt(match[1].replace(/,/g, ""));
        if (amount >= 10000) {
          score += WEIGHTS.SCHOLARSHIP_AMOUNT * 0.7;
          reasons.push("Substantial funding amount");
        } else if (amount >= 5000) {
          score += WEIGHTS.SCHOLARSHIP_AMOUNT * 0.4;
        }
      }
    }
  }

  // 4. Deadline proximity (upcoming deadlines are prioritized)
  if (scholarship.deadline) {
    try {
      const deadlineDate = new Date(scholarship.deadline);
      const today = new Date();
      const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline > 0 && daysUntilDeadline <= 90) {
        score += WEIGHTS.DEADLINE_PROXIMITY;
        reasons.push(`Deadline approaching (${daysUntilDeadline} days)`);
      } else if (daysUntilDeadline > 90 && daysUntilDeadline <= 180) {
        score += WEIGHTS.DEADLINE_PROXIMITY * 0.5;
        reasons.push("Application window open");
      }
    } catch (e) {
      // Invalid date, skip deadline scoring
    }
  }

  // 5. Field of study match in eligibility
  if (user.fieldOfStudy && scholarship.eligibility) {
    const hasFieldMatch = scholarship.eligibility.some(
      e => e.toLowerCase().includes(user.fieldOfStudy.toLowerCase())
    );
    if (hasFieldMatch) {
      score += WEIGHTS.FIELD_MATCH * 0.6;
      reasons.push(`Relevant to ${user.fieldOfStudy}`);
    }
  }

  // 6. Degree level match in course links
  if (user.degreeLevel && scholarship.courseIds && scholarship.courseIds.length > 0) {
    const levelMap = { Undergraduate: "UG", Masters: "PG", PhD: "PhD" };
    const hasLevelMatch = scholarship.courseIds.some(
      course => course.level === levelMap[user.degreeLevel]
    );
    if (hasLevelMatch) {
      score += WEIGHTS.DEGREE_LEVEL_MATCH * 0.5;
      reasons.push(`For ${user.degreeLevel} students`);
    }
  }

  return { score, reasons };
};

// =========================================================
// HELPER: Add Diversity to Results
// =========================================================
const addDiversity = (items, field = 'country', maxPerGroup = 3) => {
  const grouped = {};
  const diverse = [];

  // Group items by field
  items.forEach(item => {
    const key = item[field] || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  // Interleave items from different groups
  const keys = Object.keys(grouped);
  let index = 0;
  
  while (diverse.length < items.length) {
    let added = false;
    for (const key of keys) {
      if (grouped[key].length > 0) {
        const countInDiverse = diverse.filter(item => item[field] === key).length;
        if (countInDiverse < maxPerGroup) {
          diverse.push(grouped[key].shift());
          added = true;
        }
      }
    }
    if (!added) break; // No more items to add
  }

  return diverse;
};

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
    const { limit = 12, diverse = true } = req.query;

    // Get user's field courses for matching
    let userFieldCourses = [];
    if (user.fieldOfStudy) {
      userFieldCourses = await Course.find({
        field: { $regex: user.fieldOfStudy, $options: "i" }
      }).select("universityId").lean();
    }

    // Use saved items only for metadata, not scoring
    const savedUniIds = user.savedUniversities.map(u => u.universityId);

    // Fetch universities
    let universities = await University.find().lean();

    // Score each university
    const scored = universities.map(uni => {
      // Logic changed: No longer passing savedUnis
      const { score, reasons } = calculateUniversityScore(
        uni, 
        user, 
        userFieldCourses
      );
      return {
        ...uni,
        recommendationScore: score,
        recommendationReasons: reasons,
      };
    });

    // Sort by score
    let recommended = scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Add diversity if requested
    if (diverse === 'true' || diverse === true) {
      recommended = addDiversity(recommended.slice(0, limit * 2), 'country', 4);
    }

    // Limit results
    recommended = recommended.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: recommended,
      meta: {
        total: recommended.length,
        basedOn: {
          preferredCountry: user.preferredCountry || "Not set",
          fieldOfStudy: user.fieldOfStudy || "Not set",
          savedUniversities: savedUniIds.length,
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
    const { limit = 12, diverse = true } = req.query;

    // Build filters
    const filters = {};

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

    if (user.fieldOfStudy) {
      filters.field = { $regex: user.fieldOfStudy, $options: "i" };
    }

    // Saved items used only for metadata
    const savedUniIds = user.savedUniversities.map(u => u.universityId);

    // Fetch courses
    let courses = await Course.find(filters)
      .populate("universityId", "name country city logo ranking type")
      .lean();

    // If no results, broaden search
    if (courses.length === 0) {
      delete filters.field;
      courses = await Course.find(filters)
        .populate("universityId", "name country city logo ranking type")
        .limit(50)
        .lean();
    }

    // Score each course
    const scored = courses.map(course => {
      // Logic changed: No longer passing savedUniIds
      const { score, reasons } = calculateCourseScore(course, user);
      return {
        ...course,
        recommendationScore: score,
        recommendationReasons: reasons,
      };
    });

    // Sort by score
    let recommended = scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Add diversity by field and university
    if (diverse === 'true' || diverse === true) {
      recommended = addDiversity(recommended.slice(0, limit * 2), 'field', 3);
    }

    // Limit results
    recommended = recommended.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: recommended,
      meta: {
        total: recommended.length,
        basedOn: {
          degreeLevel: user.degreeLevel || "Not set",
          fieldOfStudy: user.fieldOfStudy || "Not set",
          savedUniversities: savedUniIds.length,
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
    const { limit = 12 } = req.query;

    // Saved items used only for metadata
    const savedUniIds = user.savedUniversities.map(u => u.universityId);

    // Get user's relevant courses
    let userCourses = [];
    if (user.fieldOfStudy) {
      userCourses = await Course.find({
        field: { $regex: user.fieldOfStudy, $options: "i" }
      }).select("_id").lean();
    }

    // Fetch scholarships with populated data
    let scholarships = await Scholarship.find()
      .populate("universityId", "name country city logo")
      .populate("courseIds", "name level field")
      .lean();

    // Score each scholarship
    const scored = scholarships.map(scholarship => {
      // Logic changed: No longer passing savedUniIds
      const { score, reasons } = calculateScholarshipScore(
        scholarship,
        user,
        userCourses
      );
      return {
        ...scholarship,
        recommendationScore: score,
        recommendationReasons: reasons,
      };
    });

    // Sort by score
    const recommended = scored
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: recommended,
      meta: {
        total: recommended.length,
        basedOn: {
          preferredCountry: user.preferredCountry || "Not set",
          fieldOfStudy: user.fieldOfStudy || "Not set",
          savedUniversities: savedUniIds.length,
        },
      },
    });
  } catch (err) {
    console.error("Get scholarship recommendations error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET ALL RECOMMENDATIONS (Combined Dashboard)
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

    // Saved items used only for metadata
    const savedUniIds = user.savedUniversities.map(u => u.universityId);

    // Get user's field courses
    let userFieldCourses = [];
    if (user.fieldOfStudy) {
      userFieldCourses = await Course.find({
        field: { $regex: user.fieldOfStudy, $options: "i" }
      }).select("universityId _id").lean();
    }

    // Fetch and score universities
    const allUniversities = await University.find().limit(100).lean();
    const scoredUniversities = allUniversities.map(uni => {
      // Logic changed: No longer passing savedUnis
      const { score, reasons } = calculateUniversityScore(uni, user, userFieldCourses);
      return { ...uni, recommendationScore: score, recommendationReasons: reasons };
    });
    const topUniversities = scoredUniversities
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 6);

    // Fetch and score courses
    const courseFilters = {};
    if (user.degreeLevel) {
      const levelMap = { Undergraduate: "UG", Masters: "PG", PhD: "PhD" };
      if (levelMap[user.degreeLevel]) courseFilters.level = levelMap[user.degreeLevel];
    }
    if (user.fieldOfStudy) {
      courseFilters.field = { $regex: user.fieldOfStudy, $options: "i" };
    }

    let allCourses = await Course.find(courseFilters)
      .populate("universityId", "name country logo ranking")
      .limit(50)
      .lean();

    if (allCourses.length === 0) {
      delete courseFilters.field;
      allCourses = await Course.find(courseFilters)
        .populate("universityId", "name country logo ranking")
        .limit(30)
        .lean();
    }

    const scoredCourses = allCourses.map(course => {
      // Logic changed: No longer passing savedUniIds
      const { score, reasons } = calculateCourseScore(course, user);
      return { ...course, recommendationScore: score, recommendationReasons: reasons };
    });
    const topCourses = scoredCourses
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 6);

    // Fetch and score scholarships
    const allScholarships = await Scholarship.find()
      .populate("universityId", "name country logo")
      .populate("courseIds", "name level field")
      .limit(50)
      .lean();

    const scoredScholarships = allScholarships.map(scholarship => {
      // Logic changed: No longer passing savedUniIds
      const { score, reasons } = calculateScholarshipScore(
        scholarship,
        user,
        userFieldCourses
      );
      return { ...scholarship, recommendationScore: score, recommendationReasons: reasons };
    });
    const topScholarships = scoredScholarships
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 6);

    res.status(200).json({
      success: true,
      data: {
        universities: topUniversities,
        courses: topCourses,
        scholarships: topScholarships,
      },
      meta: {
        userProfile: {
          preferredCountry: user.preferredCountry || "Not set",
          degreeLevel: user.degreeLevel || "Not set",
          fieldOfStudy: user.fieldOfStudy || "Not set",
          studentStatus: user.studentStatus || "Not set",
          savedUniversities: savedUniIds.length,
        },
      },
    });
  } catch (err) {
    console.error("Get all recommendations error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// =========================================================
// GET SIMILAR UNIVERSITIES (Based on a specific university)
// =========================================================
exports.getSimilarUniversities = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 8 } = req.query;

    const baseUniversity = await University.findById(id).lean();
    
    if (!baseUniversity) {
      return res.status(404).json({
        success: false,
        message: "University not found",
      });
    }

    // Get courses from this university to find field matches
    const courses = await Course.find({ universityId: baseUniversity._id })
      .select("field")
      .lean();
    const fields = [...new Set(courses.map(c => c.field).filter(Boolean))];

    // Find universities with similar attributes
    const filters = {
      _id: { $ne: baseUniversity._id } // Exclude the base university
    };

    let allUniversities = await University.find(filters).lean();

    // Score similarity
    const scored = allUniversities.map(uni => {
      let score = 0;
      const reasons = [];

      // Same country (30 points)
      if (uni.country === baseUniversity.country) {
        score += 30;
        reasons.push(`Located in ${uni.country}`);
      }

      // Similar ranking (20 points, closer = higher score)
      if (uni.ranking && baseUniversity.ranking) {
        const rankDiff = Math.abs(uni.ranking - baseUniversity.ranking);
        if (rankDiff < 50) {
          score += 20;
          reasons.push("Similar ranking");
        } else if (rankDiff < 100) {
          score += 10;
        }
      }

      // Similar tuition range (15 points)
      if (uni.tuitionMin && baseUniversity.tuitionMin) {
        const tuitionDiff = Math.abs(
          (uni.tuitionMin + uni.tuitionMax) / 2 - 
          (baseUniversity.tuitionMin + baseUniversity.tuitionMax) / 2
        );
        if (tuitionDiff < 5000) {
          score += 15;
          reasons.push("Similar tuition fees");
        } else if (tuitionDiff < 10000) {
          score += 8;
        }
      }

      // Same type (10 points)
      if (uni.type === baseUniversity.type) {
        score += 10;
        reasons.push(`${uni.type} university`);
      }

      // Similar acceptance rate (10 points)
      if (uni.acceptanceRate && baseUniversity.acceptanceRate) {
        const rateDiff = Math.abs(uni.acceptanceRate - baseUniversity.acceptanceRate);
        if (rateDiff < 10) {
          score += 10;
          reasons.push("Similar selectivity");
        }
      }

      return {
        ...uni,
        similarityScore: score,
        similarityReasons: reasons,
      };
    });

    // If fields available, boost universities with matching fields
    if (fields.length > 0) {
      const fieldMatchCourses = await Course.find({
        field: { $in: fields }
      }).select("universityId").lean();

      const uniIdsWithMatchingFields = new Set(
        fieldMatchCourses.map(c => String(c.universityId))
      );

      scored.forEach(uni => {
        if (uniIdsWithMatchingFields.has(String(uni._id))) {
          uni.similarityScore += 25;
          uni.similarityReasons.push("Offers similar programs");
        }
      });
    }

    // Sort and limit
    const similar = scored
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: similar,
      basedOn: {
        university: baseUniversity.name,
        country: baseUniversity.country,
        ranking: baseUniversity.ranking,
      },
    });
  } catch (err) {
    console.error("Get similar universities error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};