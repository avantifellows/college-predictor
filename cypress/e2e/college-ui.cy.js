describe('AF Futures - College Predictor UI', () => {
    it('should load the homepage correctly', () => {
      cy.visit('http://localhost:3000')
      cy.contains('Exam Rank College Predictor').should('exist')
    })
  
    it('should allow user to input details and see results', () => {
      cy.visit('http://localhost:3000')
  
      // Select exam type
      cy.contains('label', 'Select an exam')
        .parent()
        .find('input')
        .type('jee main')
        .type('{enter}')
  
      // Select category
      cy.contains('label', 'Select Category')
        .parent()
        .find('input')
        .type('Open')
        .type('{enter}')

       // Select round number
       cy.contains('label', 'Select Round Number')
       .parent()
       .find('input')
       .type('1')
       .type('{enter}')
  
      // Select gender
      cy.contains('label', 'Select Gender')
        .parent()
        .find('input')
        .type('Gender-Neutral')
        .type('{enter}')
  
      // Select home state
      cy.contains('label', 'Select Your Home State')
        .parent()
        .find('input')
        .type('Maharashtra')
        .type('{enter}')
  
      // Enter rank
      cy.contains('label', 'Enter Category Rank')
        .parent()
        .find('input')
        .type('1500')

      // Submit form
      cy.contains('button', 'Submit').click()

  
      // Check if results section appears (update selector as per actual DOM)
      cy.contains('h3', 'Predicted colleges and courses for you:').should('exist')
    })
  })
  