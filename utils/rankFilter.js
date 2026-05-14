/**
 * Utility functions for rank-based filtering across different exams
 */

const parseRank = (rankStr) => {
  if (!rankStr) return null;
  const numStr = rankStr.toString().replace(/[^0-9]/g, "");
  return numStr ? parseInt(numStr, 10) : null;
};

const hasPSuffix = (rankStr) => {
  if (!rankStr) return false;
  return rankStr.toString().trim().toUpperCase().endsWith("P");
};

/**
 * Creates a rank filter function for a given exam
 * @param {string} exam - The exam type (GUJCET, NEET, TNEA, JEE Main, JEE Advanced, JoSAA)
 * @param {Object} queryParams - Query parameters containing user's rank/marks input
 * @returns {Function} Filter function that returns true if an item matches the user's rank
 */
export function createRankFilter(exam, queryParams) {
  const { rank, qualifiedJeeAdv, advRank, mainRank } = queryParams;

  return (item) => {
    if (exam === "GUJCET") {
      const cutoffMarks = parseFloat(item.closing_marks) || 0;
      const userMarks = parseFloat(rank) || 0;
      return userMarks >= cutoffMarks * 0.9;
    }

    if (exam === "NEET") {
      const closingRank = parseFloat(item["Closing Rank"]) || 0;
      const userRank = parseFloat(rank) || 0;
      return closingRank >= 0.9 * userRank;
    }

    if (exam === "TNEA") {
      return parseFloat(item["Cutoff Marks"]) <= parseFloat(rank);
    }

    // For JEE Main, JEE Advanced, and JoSAA
    const itemRankStr = item["Closing Rank"]?.toString().trim() || "";
    const itemRank = parseRank(itemRankStr);
    const itemHasPSuffix = hasPSuffix(itemRankStr);

    if (exam === "JoSAA") {
      if (item["Exam"] === "JEE Advanced") {
        if (qualifiedJeeAdv !== "Yes" || !advRank) return false;
        const userRankStr = advRank?.toString().trim() || "";
        const userRank = parseRank(userRankStr);
        const userHasPSuffix = hasPSuffix(userRankStr);
        if (itemHasPSuffix !== userHasPSuffix) return false;
        return userRank && itemRank >= 0.9 * userRank;
      } else {
        if (!mainRank) return false;
        const userRankStr = mainRank?.toString().trim() || "";
        const userRank = parseRank(userRankStr);
        const userHasPSuffix = hasPSuffix(userRankStr);
        if (itemHasPSuffix !== userHasPSuffix) return false;
        return userRank && itemRank >= 0.9 * userRank;
      }
    }

    if (exam === "JEE Advanced") {
      if (item["Exam"] !== "JEE Advanced") return false;
      if (!advRank) return false;
      const userRankStr = advRank?.toString().trim() || "";
      const userRank = parseRank(userRankStr);
      const userHasPSuffix = hasPSuffix(userRankStr);
      if (itemHasPSuffix !== userHasPSuffix) return false;
      return userRank && itemRank >= 0.9 * userRank;
    }

    if (exam === "JEE Main") {
      if (item["Exam"] === "JEE Advanced") return false;
      if (!mainRank) return false;
      const userRankStr = mainRank?.toString().trim() || "";
      const userRank = parseRank(userRankStr);
      const userHasPSuffix = hasPSuffix(userRankStr);
      if (itemHasPSuffix !== userHasPSuffix) return false;
      return userRank && itemRank >= 0.9 * userRank;
    }

    return true;
  };
}

export { parseRank, hasPSuffix };
