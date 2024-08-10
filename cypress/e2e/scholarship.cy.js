import { scholarshipConfig } from "../../scholarshipConfig";
describe("Scholarship Page", () => {
  beforeEach(() => {
    cy.visit("/scholarships");
  });
  // add test for head element
  it("should have the correct head elements", () => {
    cy.title().should("eq", "Scholarships - Home");
  });
  it("should display the scholarship form", () => {
    cy.contains("h1", scholarshipConfig.name).should("be.visible");
  });
  it("should have all form fields", () => {
    for (const field of scholarshipConfig.fields) {
      cy.contains("label", field.label).should("be.visible");
    }
  });

  it("should enable submit button when all fields are filled", () => {
    cy.get("button").contains("Submit").should("be.disabled");

    // Fill out all the fields
    cy.get('div[class*="react-select__control"]').each(($el, index) => {
      cy.wrap($el).click();
      cy.get('div[class*="react-select__option"]').first().click();
    });

    cy.get("button").contains("Submit").should("not.be.disabled");
  });

  it("should navigate to results page on form submission with proper query parameters", () => {
    // Fill out all the fields
    cy.get('div[class*="react-select__control"]').each(($el, index) => {
      cy.wrap($el).click();
      cy.get('div[class*="react-select__option"]').first().click();
    });

    cy.get("button").contains("Submit").click();

    // Check if URL has changed to the results page & has the required query parameters
    cy.url().should("include", "/scholarships_result");
    for (const field of scholarshipConfig.fields) {
      const fieldValue = field.options[0].value || field.options[0];
      cy.url().should(
        "match",
        new RegExp(`${field.name}=${encodeURIComponent(fieldValue)}`, "i")
      );
    }
  });
});
