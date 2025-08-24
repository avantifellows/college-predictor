describe("Rank Predictor Page Tests", () => {
  beforeEach(() => {
    // Visit the rank predictor page
    cy.visit("/rankpredictor");

    // Wait for the page to load
    cy.contains("Futures").should("be.visible");
    cy.contains("Get accurate predictions for your JEE Main percentile").should(
      "be.visible"
    );
  });

  it("should load the page and display initial UI elements", () => {
    // Check if main heading is present
    cy.contains("h1", "Futures").should("be.visible");

    // Check if description is present
    cy.contains(
      "Get accurate predictions for your JEE Main percentile and rank based on your marks and category"
    ).should("be.visible");

    // Check if model status indicator is present
    cy.contains("Model Status:").should("be.visible");

    // Check if form elements are present
    cy.get('input[type="number"]').should("be.visible");
    cy.get("select").should("be.visible");
    cy.contains("button", "Predict My Results").should("be.visible");

    // Check if instructions section is present
    cy.contains("How to Use").should("be.visible");
  });

  it("should wait for model to load and enable form elements", () => {
    // Initially check if model is loading
    cy.contains("Loading Model...").should("be.visible");

    // Wait for model to load (increase timeout as model loading can take time)
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // Check if green indicator appears when model is loaded
    cy.get(".bg-emerald-500").should("be.visible");
    cy.contains("✨").should("be.visible");

    // Verify form elements are enabled after model loads
    cy.get('input[type="number"]').should("not.be.disabled");
    cy.get("select").should("not.be.disabled");
    cy.get("button").contains("Predict My Results").should("not.be.disabled");
  });

  it("should validate input fields correctly", () => {
    // Wait for model to load
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // Test empty marks validation
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Please enter valid marks").should("be.visible");

    // Test decimal marks (should show error)
    cy.get('input[type="number"]').clear().type("250.5");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Marks must be a whole number (no decimals allowed)").should(
      "be.visible"
    );

    // Test marks below minimum range
    cy.get('input[type="number"]').clear().type("-100");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Marks must be between -75 and 300").should("be.visible");

    // Test invalid marks (too high)
    cy.get('input[type="number"]').clear().type("350");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Marks must be between -75 and 300").should("be.visible");

    // Test non-numeric input
    cy.get('input[type="number"]').clear().type("abc");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Please enter valid marks").should("be.visible");
  });

  it("should successfully predict results for valid input (General category)", () => {
    // Wait for model to load
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // Enter valid marks
    cy.get('input[type="number"]').clear().type("250");

    // Select General category (should be default)
    cy.get("select").select("GEN");

    // Click predict button
    cy.get("button").contains("Predict My Results").click();

    // Wait for prediction results
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );

    // Verify all result components are present
    cy.contains("Marks (/300)").should("be.visible");
    cy.contains("Percentile").should("be.visible");
    cy.contains("All India Rank").should("be.visible");
    cy.contains("GEN Rank").should("be.visible");

    // Check if marks value is displayed correctly
    cy.contains("250").should("be.visible");

    // Check if percentile is displayed (should be a number with %)
    cy.contains("%").should("be.visible");

    // Check if performance category is displayed
    cy.get(".rounded-full").contains("🎯").should("be.visible");
  });

  it("should successfully predict results for OBC category", () => {
    // Wait for model to load
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // Enter valid marks
    cy.get('input[type="number"]').clear().type("200");

    // Select OBC category
    cy.get("select").select("OBC");

    // Click predict button
    cy.get("button").contains("Predict My Results").click();

    // Wait for prediction results
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );

    // Verify OBC rank is displayed
    cy.contains("OBC Rank").should("be.visible");

    // Check if marks value is displayed correctly
    cy.contains("200").should("be.visible");
  });

  it("should successfully predict results for SC category", () => {
    // Wait for model to load
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // Enter valid marks
    cy.get('input[type="number"]').clear().type("150");

    // Select SC category
    cy.get("select").select("SC");

    // Click predict button
    cy.get("button").contains("Predict My Results").click();

    // Wait for prediction results
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );

    // Verify SC rank is displayed
    cy.contains("SC Rank").should("be.visible");

    // Check if marks value is displayed correctly
    cy.contains("150").should("be.visible");
  });

  it("should test edge cases - minimum and maximum marks", () => {
    // Wait for model to load
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // Test minimum marks (-75)
    cy.get('input[type="number"]').clear().type("-75");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("-75").should("be.visible");

    // Test maximum marks (300)
    cy.get('input[type="number"]').clear().type("300");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("300").should("be.visible");

    // Test negative marks within range
    cy.get('input[type="number"]').clear().type("-50");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("-50").should("be.visible");
  });

  it("should reject decimal marks input", () => {
    // Wait for model to load
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // Enter decimal marks (should be rejected)
    cy.get('input[type="number"]').clear().type("245.7");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();

    // Should show validation error instead of results
    cy.contains("Marks must be a whole number (no decimals allowed)").should(
      "be.visible"
    );

    // Verify no prediction results are shown
    cy.contains("Your Prediction Results").should("not.exist");
  });

  it("should verify all instruction steps are visible", () => {
    // Check all instruction steps
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

    // Check numbered indicators
    cy.contains("span", "1").should("be.visible");
    cy.contains("span", "2").should("be.visible");
    cy.contains("span", "3").should("be.visible");
    cy.contains("span", "4").should("be.visible");
  });

  it("should test multiple predictions in sequence", () => {
    // Wait for model to load
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // First prediction
    cy.get('input[type="number"]').clear().type("200");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );

    // Second prediction with different values
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
    // Wait for model to load
    cy.contains("Ready to Predict", { timeout: 30000 }).should("be.visible");

    // Test valid negative marks within range
    cy.get('input[type="number"]').clear().type("-25");
    cy.get("select").select("GEN");
    cy.get("button").contains("Predict My Results").click();

    // Should get prediction results
    cy.contains("Your Prediction Results", { timeout: 15000 }).should(
      "be.visible"
    );
    cy.contains("-25").should("be.visible");
    cy.contains("GEN Rank").should("be.visible");
  });
});
