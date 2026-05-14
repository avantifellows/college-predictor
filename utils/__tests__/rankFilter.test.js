import { createRankFilter, parseRank, hasPSuffix } from "../rankFilter";

describe("rankFilter utilities", () => {
  describe("parseRank", () => {
    it("should parse numeric rank strings", () => {
      expect(parseRank("12345")).toBe(12345);
      expect(parseRank("100")).toBe(100);
    });

    it("should parse rank strings with P suffix", () => {
      expect(parseRank("12345P")).toBe(12345);
      expect(parseRank("100P")).toBe(100);
    });

    it("should return null for invalid inputs", () => {
      expect(parseRank("")).toBeNull();
      expect(parseRank(null)).toBeNull();
      expect(parseRank(undefined)).toBeNull();
      expect(parseRank("ABC")).toBeNull();
    });
  });

  describe("hasPSuffix", () => {
    it("should detect P suffix in rank strings", () => {
      expect(hasPSuffix("12345P")).toBe(true);
      expect(hasPSuffix("100P")).toBe(true);
      expect(hasPSuffix("100p")).toBe(true);
    });

    it("should return false for ranks without P suffix", () => {
      expect(hasPSuffix("12345")).toBe(false);
      expect(hasPSuffix("100")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(hasPSuffix(null)).toBe(false);
      expect(hasPSuffix(undefined)).toBe(false);
    });
  });

  describe("createRankFilter", () => {
    describe("NEET filtering", () => {
      it("should show colleges where closing rank >= 90% of user rank", () => {
        const filter = createRankFilter("NEET", { rank: "1000" });

        // Closing rank 900 >= 0.9 * 1000 = 900 ✓
        expect(filter({ "Closing Rank": "900" })).toBe(true);

        // Closing rank 899 < 0.9 * 1000 = 900 ✗
        expect(filter({ "Closing Rank": "899" })).toBe(false);

        // Closing rank 1000 >= 0.9 * 1000 = 900 ✓
        expect(filter({ "Closing Rank": "1000" })).toBe(true);
      });
    });

    describe("GUJCET filtering", () => {
      it("should show colleges where user marks >= 90% of cutoff", () => {
        const filter = createRankFilter("GUJCET", { rank: "100" });

        // Cutoff 90: 100 >= 0.9 * 90 = 81 ✓
        expect(filter({ closing_marks: "90" })).toBe(true);

        // Cutoff 150: 100 >= 0.9 * 150 = 135 ✗
        expect(filter({ closing_marks: "150" })).toBe(false);
      });
    });

    describe("TNEA filtering", () => {
      it("should show colleges where cutoff marks <= user marks", () => {
        const filter = createRankFilter("TNEA", { rank: "500" });

        // Cutoff 450 <= 500 ✓
        expect(filter({ "Cutoff Marks": "450" })).toBe(true);

        // Cutoff 550 <= 500 ✗
        expect(filter({ "Cutoff Marks": "550" })).toBe(false);
      });
    });

    describe("JEE Main filtering", () => {
      it("should filter by main rank excluding JEE Advanced exams", () => {
        const filter = createRankFilter("JEE Main", { mainRank: "10000" });

        // JEE Advanced exam should be excluded
        expect(
          filter({ Exam: "JEE Advanced", "Closing Rank": "8000" })
        ).toBe(false);

        // JEE Main exam with matching rank
        expect(filter({ Exam: "JEE Main", "Closing Rank": "9000" })).toBe(true);
      });

      it("should handle P suffix matching", () => {
        const filter = createRankFilter("JEE Main", { mainRank: "10000P" });

        // Item with P suffix: 9000P >= 0.9 * 10000 ✓
        expect(filter({ Exam: "JEE Main", "Closing Rank": "9000P" })).toBe(
          true
        );

        // Item without P suffix should not match when user has P
        expect(filter({ Exam: "JEE Main", "Closing Rank": "9000" })).toBe(
          false
        );
      });
    });

    describe("JoSAA filtering", () => {
      it("should filter by main rank for non-Advanced exams", () => {
        const filter = createRankFilter("JoSAA", {
          mainRank: "10000",
          qualifiedJeeAdv: "No",
        });

        // Non-Advanced exam with matching rank
        expect(
          filter({ Exam: "JEE Main", "Closing Rank": "9000" })
        ).toBe(true);
      });

      it("should require advRank if qualified for JEE Advanced", () => {
        const filter = createRankFilter("JoSAA", {
          mainRank: "10000",
          qualifiedJeeAdv: "Yes",
          advRank: undefined,
        });

        // Should fail for JEE Advanced without advRank
        expect(filter({ Exam: "JEE Advanced", "Closing Rank": "5000" })).toBe(
          false
        );
      });

      it("should filter Advanced exams when qualified", () => {
        const filter = createRankFilter("JoSAA", {
          qualifiedJeeAdv: "Yes",
          advRank: "5000",
        });

        // JEE Advanced with matching rank
        expect(filter({ Exam: "JEE Advanced", "Closing Rank": "4500" })).toBe(
          true
        );
      });
    });
  });
});
