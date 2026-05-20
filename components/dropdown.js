import React, { useId, useEffect, useState } from "react";
import Select from "react-select";

const getCustomStyles = (isDark) => ({
  control: (provided, state) => ({
    ...provided,
    minHeight: "48px",
    borderRadius: "0.75rem",
    borderColor: state.isFocused ? "#cc3033" : isDark ? "rgba(72,68,66,0.7)" : "#d8c7c1",
    backgroundColor: isDark ? "#2a2826" : "#fffdfa",
    color: isDark ? "#e8e5e3" : "#2f2320",
    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(204, 48, 51, 0.18)"
      : "0 1px 2px 0 rgba(47, 35, 32, 0.05)",
    "&:hover": {
      borderColor: "#cc3033",
    },
  }),
  option: (provided, state) => ({
    ...provided,
    padding: "0.75rem 1rem",
    color: state.isSelected ? "#fff" : isDark ? "#e8e5e3" : "#332724",
    backgroundColor: state.isSelected
      ? "#cc3033"
      : state.isFocused
      ? isDark ? "#383533" : "#f8efec"
      : isDark ? "#2a2826" : "white",
    "&:active": {
      backgroundColor: state.isSelected ? "#b52326" : isDark ? "#484442" : "#f3dfd9",
    },
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "0.75rem",
    overflow: "hidden",
    boxShadow: isDark
      ? "0 10px 30px rgba(0,0,0,0.5)"
      : "0 10px 30px rgba(47, 35, 32, 0.12)",
    border: isDark ? "1px solid rgba(72,68,66,0.6)" : "1px solid #eaded8",
    backgroundColor: isDark ? "#2a2826" : "white",
  }),
  menuList: (provided) => ({
    ...provided,
    backgroundColor: isDark ? "#2a2826" : "white",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: isDark ? "#e8e5e3" : "#2f2320",
  }),
  input: (provided) => ({
    ...provided,
    color: isDark ? "#e8e5e3" : "#2f2320",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: isDark ? "#8c8480" : "#7a6159",
  }),
});

const Dropdown = ({
  options,
  onChange,
  isDisabled,
  selectedValue,
  className,
}) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () =>
      setIsDark(document.documentElement.classList.contains("dark"));

    checkDark();

    // Watch for class changes on <html>
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Select
      options={options}
      onChange={onChange}
      isDisabled={isDisabled}
      styles={getCustomStyles(isDark)}
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

