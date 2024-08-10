import getConstants from "../../constants";
import examConfigs from "../../examConfig";

describe("ExamForm", () => {
  beforeEach(() => {
    cy.visit("/");
  });
  it("should display the title correctly", () => {
    cy.get("h1").should("contain", getConstants().TITLE);
  });

  it("should allow selecting an exam and display relevant fields for all exams", () => {
    Object.entries(examConfigs).forEach(([examName, examConfig]) => {
      // Select the exam
      cy.get("label")
        .contains("Select an exam")
        .parent()
        .find(".react-select__control")
        .click();

      cy.get(".react-select__option").contains(examName).click();

      // Check if relevant fields are displayed
      examConfig.fields.forEach((field) => {
        cy.get("label").contains(field.label).should("be.visible");
      });

      // Check if the rank input field is displayed
      cy.get("label").contains("Enter Category Rank").should("be.visible");

      // Re-open the exam dropdown for the next iteration
      cy.get("label")
        .contains("Select an exam")
        .parent()
        .find(".react-select__control")
        .click();

      // Clear the selection by selecting the first option
      cy.get(".react-select__menu")
        .find(".react-select__option")
        .first()
        .click();
    });
  });

  it("should render the form and allow user interaction for all exams", () => {
    Object.entries(examConfigs).forEach(([examName, examConfig]) => {
      // Select an exam
      cy.get("label")
        .contains("Select an exam")
        .parent()
        .find("div[class*='control']")
        .click();
      cy.get("div[class*='menu']").contains(examName).click();

      // Fill out the form
      examConfig.fields.forEach((field, index) => {
        cy.get("label")
          .contains(field.label)
          .parent()
          .find("div[class*='control']")
          .click();
        cy.get("div[class*='menu']")
          .find("div[class*='option']")
          .first()
          .click();
      });

      // Enter rank
      cy.get('input[type="number"]').clear().type("1000");

      // Submit button should be enabled
      cy.get("button").contains("Submit").should("not.be.disabled");

      // Click submit and check if it navigates to the correct page
      cy.get("button").contains("Submit").click();

      // Check if the URL has changed to the college predictor page with correct query params
      cy.url().should("include", "/college_predictor?");
      cy.url().should("include", `exam=${encodeURIComponent(examName)}`);
      cy.url().should("include", "rank=1000");

      // Check for exam-specific query parameters
      examConfig.fields.forEach((field) => {
        const fieldValue = field.options[0].value || field.options[0];
        cy.url().should(
          "match",
          new RegExp(`${field.name}=${encodeURIComponent(fieldValue)}`, "i")
        );
      });
      // Navigate back to the form page
      cy.visit("/");
    });
  });

  it("should disable submit button when form is incomplete", () => {
    // Select an exam (using the first exam in the config for this test)
    const firstExam = Object.keys(examConfigs)[0];
    cy.get("label")
      .contains("Select an exam")
      .parent()
      .find("div[class*='control']")
      .click();
    cy.get("div[class*='menu']").contains(firstExam).click();

    // Fill out only some fields, leaving others empty
    cy.get("label").eq(1).parent().find("div[class*='control']").click();
    cy.get("div[class*='menu']").find("div[class*='option']").first().click();

    // Submit button should be disabled
    cy.get("button").contains("Submit").should("be.disabled");

    // Error message should be visible
    cy.contains("Please fill all the fields before submitting!").should(
      "be.visible"
    );
  });
});
