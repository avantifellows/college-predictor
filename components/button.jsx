// Button.jsx
import React from 'react';
import styles from '../styles/button.module.css'; // Import the CSS module

const Button = ({buttonText}) => {
  return (
    <button className={styles.cta}>
      <span className={`${styles['hover-underline-animation']}`}>{buttonText}</span>
    </button>
  );
};

export default Button;
