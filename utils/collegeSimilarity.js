// Course similarity mapping
const courseSimilarity = {
  'Computer Science and Engineering (CSE)': ['Information Technology (IT)', 'Electronics and Communication Engineering (ECE)', 'Software Engineering (SE)'],
  'Information Technology (IT)': ['Computer Science and Engineering (CSE)', 'Electronics and Communication Engineering (ECE)', 'Software Engineering (SE)'],
  'Electronics and Communication Engineering (ECE)': ['Computer Science and Engineering (CSE)', 'Information Technology (IT)', 'Electronics and Electronics (EEE)'],
  'Mechanical Engineering': ['Production Engineering', 'Industrial Engineering', 'Automobile Engineering'],
  'Civil Engineering': ['Environmental Engineering', 'Structural Engineering'],
  'Electrical Engineering': ['Electronics and Electronics (EEE)', 'Power Engineering'],
  'Chemical Engineering': ['Biochemical Engineering', 'Petroleum Engineering'],
};

// College type mapping
const collegeTypes = {
  'IIT': 'Government',
  'NIT': 'Government',
  'IIIT': 'Government',
  'DTU': 'Government',
  'NSIT': 'Government',
  'BITS': 'Private',
  'VIT': 'Private',
  'Manipal': 'Private',
  'Thapar': 'Private',
  'Amity': 'Private',
};

// Get college type based on name
export const getCollegeType = (collegeName) => {
  if (!collegeName) return 'Private'; // Default to private if no name provided
  
  for (const [key, value] of Object.entries(collegeTypes)) {
    if (collegeName.includes(key)) {
      return value;
    }
  }
  return 'Private'; // Default to private if not found
};

// Calculate similarity score between two colleges
export const calculateSimilarity = (targetCollege, alternativeCollege) => {
  if (!targetCollege || !alternativeCollege) return 0;
  
  let score = 0;
  const maxScore = 100;
  
  // Course similarity (40% weight)
  if (targetCollege.course && alternativeCollege.course) {
    if (targetCollege.course === alternativeCollege.course) {
      score += 40;
    } else if (courseSimilarity[targetCollege.course]?.includes(alternativeCollege.course)) {
      score += 30;
    } else if (targetCollege.course.split(' ')[0] === alternativeCollege.course.split(' ')[0]) {
      score += 20;
    }
  }

  // Location similarity (20% weight)
  if (targetCollege.location && alternativeCollege.location) {
    if (targetCollege.location === alternativeCollege.location) {
      score += 20;
    } else if (targetCollege.location.split(' ')[0] === alternativeCollege.location.split(' ')[0]) {
      score += 10;
    }
  }

  // College type similarity (20% weight)
  if (targetCollege.type && alternativeCollege.type) {
    if (targetCollege.type === alternativeCollege.type) {
      score += 20;
    }
  }

  // Rank proximity (20% weight)
  if (targetCollege.closingRank && alternativeCollege.closingRank) {
    const targetRank = parseInt(targetCollege.closingRank);
    const altRank = parseInt(alternativeCollege.closingRank);
    if (!isNaN(targetRank) && !isNaN(altRank)) {
      const rankDiff = Math.abs(targetRank - altRank);
      if (rankDiff <= 1000) {
        score += 20;
      } else if (rankDiff <= 5000) {
        score += 15;
      } else if (rankDiff <= 10000) {
        score += 10;
      } else if (rankDiff <= 20000) {
        score += 5;
      }
    }
  }

  return Math.min(score, maxScore);
};

// Find similar colleges
export const findSimilarColleges = (targetCollege, allColleges, maxResults = 5) => {
  if (!targetCollege || !allColleges || allColleges.length === 0) {
    return [];
  }

  const targetWithType = {
    ...targetCollege,
    type: getCollegeType(targetCollege.institute),
  };

  const alternatives = allColleges
    .filter(college => {
      const transformedCollege = {
        institute: college["Institute"],
        course: college["Academic Program Name"] || college["Course"],
        location: college["State"],
        closingRank: college["Closing Rank"] || college["Cutoff Marks"],
      };
      return transformedCollege.institute !== targetCollege.institute;
    })
    .map(college => {
      const transformedCollege = {
        institute: college["Institute"],
        course: college["Academic Program Name"] || college["Course"],
        location: college["State"],
        closingRank: college["Closing Rank"] || college["Cutoff Marks"],
        type: getCollegeType(college["Institute"]),
      };
      return {
        ...transformedCollege,
        similarityScore: calculateSimilarity(targetWithType, transformedCollege),
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxResults);

  return alternatives;
}; 