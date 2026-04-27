import fs from "fs/promises";

export const parseRank = (rankStr) => {
  if (!rankStr) return null;
  const numStr = rankStr.toString().replace(/[^0-9]/g, "");
  return numStr ? parseInt(numStr, 10) : null;
};

export const hasPSuffix = (rankStr) => {
  if (!rankStr) return false;
  return rankStr.toString().trim().toUpperCase().endsWith("P");
};

export const loadCollegeData = async (dataPath) => {
  const data = await fs.readFile(dataPath, "utf8");
  return JSON.parse(data);
};

export const createRankFilter = (exam, query) => {
  return (item) => {
    const rank = query.rank;

    if (exam === "GUJCET") {
      const cutoffMarks = parseFloat(item.closing_marks) || 0;
      const userMarks = parseFloat(rank) || 0;
      return userMarks >= cutoffMarks * 0.9;
    } else if (exam === "NEET") {
      const closingRank = parseFloat(item["Closing Rank"]) || 0;
      const userRank = parseFloat(rank) || 0;
      return closingRank >= 0.9 * userRank;
    } else if (exam === "TNEA") {
      return parseFloat(item["Cutoff Marks"]) <= parseFloat(rank);
    }

    const itemRankStr = item["Closing Rank"]?.toString().trim() || "";
    const itemRank = parseRank(itemRankStr);
    const itemHasPSuffix = hasPSuffix(itemRankStr);

    if (exam === "JoSAA") {
      if (item["Exam"] === "JEE Advanced") {
        if (query.qualifiedJeeAdv !== "Yes" || !query.advRank) return false;

        const userRankStr = query.advRank?.toString().trim() || "";
        const userRank = parseRank(userRankStr);
        const userHasPSuffix = hasPSuffix(userRankStr);

        if (itemHasPSuffix !== userHasPSuffix) return false;
        return userRank && itemRank >= 0.9 * userRank;
      } else {
        if (!query.mainRank) return false;

        const userRankStr = query.mainRank?.toString().trim() || "";
        const userRank = parseRank(userRankStr);
        const userHasPSuffix = hasPSuffix(userRankStr);

        if (itemHasPSuffix !== userHasPSuffix) return false;
        return userRank && itemRank >= 0.9 * userRank;
      }
    } else if (exam === "JEE Advanced") {
      if (item["Exam"] !== "JEE Advanced") return false;
      if (!query.advRank) return false;

      const userRankStr = query.advRank?.toString().trim() || "";
      const userRank = parseRank(userRankStr);
      const userHasPSuffix = hasPSuffix(userRankStr);

      if (itemHasPSuffix !== userHasPSuffix) return false;
      return userRank && itemRank >= 0.9 * userRank;
    } else if (exam === "JEE Main") {
      if (item["Exam"] === "JEE Advanced") return false;
      if (!query.mainRank) return false;

      const userRankStr = query.mainRank?.toString().trim() || "";
      const userRank = parseRank(userRankStr);
      const userHasPSuffix = hasPSuffix(userRankStr);

      if (itemHasPSuffix !== userHasPSuffix) return false;
      return userRank && itemRank >= 0.9 * userRank;
    } else {
      return true;
    }
  };
};

export const applyFilters = (data, filters, rankFilter) => {
  let filteredData = data;

  if (Array.isArray(filters)) {
    filteredData = filteredData.filter((item) => {
      return filters.every((filterFn) => filterFn(item));
    });
  }

  if (rankFilter) {
    filteredData = filteredData.filter(rankFilter);
  }

  return filteredData;
};

export const sortColleges = (data, exam, config) => {
  const sortedData = [...data];

  if (config.getSort) {
    const sortConfig = config.getSort();
    if (sortConfig && sortConfig.length > 0) {
      const [sortKey, sortOrder] = sortConfig[0];
      sortedData.sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];

        if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
          valA = parseFloat(valA);
          valB = parseFloat(valB);
        }

        if (sortOrder === "DESC") {
          return valB - valA;
        }
        return valA - valB;
      });
    }
  } else if (exam === "TGEAPCET") {
    sortedData.sort((a, b) => {
      const rankA = parseInt(a.closing_rank, 10) || 0;
      const rankB = parseInt(b.closing_rank, 10) || 0;
      return rankA - rankB;
    });
  } else if (exam === "TNEA") {
    sortedData.sort((collegeA, collegeB) => {
      const collegeAMarks = parseFloat(collegeA["Cutoff Marks"]) || 0;
      const collegeBMarks = parseFloat(collegeB["Cutoff Marks"]) || 0;
      return collegeBMarks - collegeAMarks;
    });
  } else if (
    exam === "JEE Main" ||
    exam === "JEE Advanced" ||
    exam === "JoSAA"
  ) {
    sortedData.sort((collegeA, collegeB) => {
      const rankA = parseFloat(collegeA["Closing Rank"]) || 0;
      const rankB = parseFloat(collegeB["Closing Rank"]) || 0;
      return rankA - rankB;
    });
  }

  return sortedData;
};
