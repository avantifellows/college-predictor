import React from "react";
import Select from "react-select";
import styles from "../styles/dropdown.module.css";

const Dropdown = ({ options, onChange, isDisabled }) => {
  return (
    <Select
      options={options}
      onChange={onChange}
      classNamePrefix="option"
      isDisabled={isDisabled}
      className={styles.control}
    />
  );
};

export default Dropdown;
