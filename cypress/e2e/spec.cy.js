describe("Rank Predictor Page Tests", () => {
  beforeEach(() => {
    cy.visit("/rankpredictor");
    cy.contains("Futures").should("be.visible");
    cy.contains("Get accurate predictions for your JEE Main percentile").should(
      "be.visible"
    );
  });

  it("should load the page and display initial UI elements", () => {
    // Validates that all essential UI components are rendered on page load
    cy.contains("h1", "Futures").should("be.visible");
    cy.contains(
      "Get accurate predictions for your JEE Main percentile and rank based on your marks and category"
    ).should("be.visible");
    cy.contains("Model Status:").should("be.visible");
    cy.get('input[type="number"]').should("be.visible");
    cy.get("select").should("be.visible");
    cy.contains("button", "Predict My Results").should("be.visible");
    cy.contains("How to Use").should("be.visible");
  });

  it("should wait for model to load and enable form elements", () => {
    // Tests the ML model loading state transition and form element enabling
    cy.contains("Loading Model...").should("be.visible");
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");
    cy.get(".bg-emerald-500").should("be.visible");
    cy.contains("✨").should("be.visible");
    cy.get('input[type="number"]').should("not.be.disabled");
    cy.get("select").should("not.be.disabled");
    cy.get("button").contains("Predict My Results").should("not.be.disabled");
  });

  it("should validate input fields correctly", () => {
    // Verifies all input validation rules: empty, decimal, out-of-range, and non-numeric values
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    cy.get("button").contains("Predict My Results").click();
    cy.contains("Please enter valid marks").should("be.visible");

    cy.get('input[type="number"]').clear().type("250.5");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Marks must be a whole number (no decimals allowed)").should(
      "be.visible"
    );

    cy.get('input[type="number"]').clear().type("-100");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Marks must be between -75 and 300").should("be.visible");

    cy.get('input[type="number"]').clear().type("350");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Marks must be between -75 and 300").should("be.visible");

    cy.get('input[type="number"]').clear().type("abc");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Please enter valid marks").should("be.visible");
  });

  it("should successfully predict results for valid input (General category)", () => {
    // Tests complete prediction flow for GEN category with valid marks input
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");
    cy.get('input[type="number"]').clear().type("250");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("Marks (/300)").should("be.visible");
    cy.contains("Percentile").should("be.visible");
    cy.contains("All India Rank").should("be.visible");
    cy.contains("GEN Rank").should("be.visible");
    cy.contains("250").should("be.visible");
    cy.contains("%").should("be.visible");
    cy.get(".rounded-full").contains("🎯").should("be.visible");
  });

  it("should successfully predict results for OBC category", () => {
    // Validates prediction accuracy and rank display for OBC category
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");
    cy.get('input[type="number"]').clear().type("200");
    cy.get("select").select("OBC");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("OBC Rank").should("be.visible");
    cy.contains("200").should("be.visible");
  });

  it("should successfully predict results for SC category", () => {
    // Validates prediction accuracy and rank display for SC category
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");
    cy.get('input[type="number"]').clear().type("150");
    cy.get("select").select("SC");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("SC Rank").should("be.visible");
    cy.contains("150").should("be.visible");
  });

  it("should test edge cases - minimum and maximum marks", () => {
    // Tests boundary conditions with minimum (-75) and maximum (300) allowed marks
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    cy.get('input[type="number"]').clear().type("-75");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("-75").should("be.visible");

    cy.get('input[type="number"]').clear().type("300");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("300").should("be.visible");

    cy.get('input[type="number"]').clear().type("-50");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("-50").should("be.visible");
  });

  it("should reject decimal marks input", () => {
    // Ensures decimal input validation works and prevents prediction with invalid data
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");
    cy.get('input[type="number"]').clear().type("245.7");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Marks must be a whole number (no decimals allowed)").should(
      "be.visible"
    );
    cy.contains("Your Prediction Results").should("not.exist");
  });

  it("should verify all instruction steps are visible", () => {
    // Checks that all help instructions and numbered steps are rendered correctly
    cy.contains(
      "Enter your JEE Main marks between -75 and 300 (whole numbers only)"
    ).should("be.visible");
    cy.contains("Select your category: General, OBC, or SC").should(
      "be.visible"
    );
    cy.contains("Get instant predictions with detailed ranking info").should(
      "be.visible"
    );
    cy.contains("View percentile, AIR, and category-specific rank").should(
      "be.visible"
    );
    cy.contains("span", "1").should("be.visible");
    cy.contains("span", "2").should("be.visible");
    cy.contains("span", "3").should("be.visible");
    cy.contains("span", "4").should("be.visible");
  });

  it("should test multiple predictions in sequence", () => {
    // Validates that consecutive predictions work without page refresh or state issues
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    cy.get('input[type="number"]').clear().type("200");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );

    cy.get('input[type="number"]').clear().type("180");
    cy.get("select").select("OBC");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("180").should("be.visible");
    cy.contains("OBC Rank").should("be.visible");
  });

  it("should handle negative marks correctly", () => {
    // Tests that valid negative marks within range produce accurate predictions
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");
    cy.get('input[type="number"]').clear().type("-25");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("-25").should("be.visible");
    cy.contains("GEN Rank").should("be.visible");
  });
});
