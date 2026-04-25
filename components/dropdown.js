import React, { useId } from "react";
import Select from "react-select";

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: "46px",
    borderRadius: "0.9rem",
    borderColor: state.isFocused ? "var(--brand)" : "var(--stroke)",
    backgroundColor: "var(--surface)",
    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(182, 58, 48, 0.16)"
      : "0 1px 2px 0 rgba(15, 23, 42, 0.06)",
    "&:hover": {
      borderColor: "var(--brand)",
    },
  }),
  option: (provided, state) => ({
    ...provided,
    padding: "0.75rem 1rem",
    color: state.isSelected ? "white" : "var(--text)",
    backgroundColor: state.isSelected
      ? "var(--brand)"
      : state.isFocused
      ? "var(--bg-soft)"
      : "white",
    "&:active": {
      backgroundColor: state.isSelected ? "var(--brand-strong)" : "var(--bg-soft)",
    },
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "0.95rem",
    overflow: "hidden",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.12)",
    border: "1px solid #e2e8f0",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#111827",
  }),
  input: (provided) => ({
    ...provided,
    color: "#111827",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "var(--text-muted)",
  }),
};

const Dropdown = ({
  options,
  onChange,
  isDisabled,
  selectedValue,
  className,
}) => {
  return (
    <Select
      options={options}
      onChange={onChange}
      isDisabled={isDisabled}
      styles={customStyles}
      instanceId={useId()}
      className={className}
      value={options.find(
        (option) =>
          option.label === selectedValue || option.value === selectedValue
      )}
    />
  );
};

export default Dropdown;
