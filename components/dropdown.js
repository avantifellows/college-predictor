import React, { useEffect, useId, useState } from "react";
import Select from "react-select";

const getCustomStyles = (isMobile) => ({
  control: (provided, state) => ({
    ...provided,
    minHeight: "48px",
    borderRadius: "0.75rem",
    borderColor: state.isFocused ? "#b52326" : "#d8c7c1",
    backgroundColor: "#fffdfa",
    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(181, 35, 38, 0.12)"
      : "0 1px 2px 0 rgba(47, 35, 32, 0.05)",
    "&:hover": {
      borderColor: "#b52326",
    },
  }),
  option: (provided, state) => ({
    ...provided,
    alignItems: "center",
    color: state.isSelected ? "white" : "#332724",
    display: "flex",
    minHeight: "48px",
    padding: isMobile ? "0.875rem 1rem" : "0.75rem 1rem",
    backgroundColor: state.isSelected
      ? "#b52326"
      : state.isFocused
      ? "#f8efec"
      : "white",
    "&:active": {
      backgroundColor: state.isSelected ? "#9e1f22" : "#f3dfd9",
    },
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "0.75rem",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(47, 35, 32, 0.12)",
    border: "1px solid #eaded8",
    zIndex: 30,
  }),
  menuList: (provided) => ({
    ...provided,
    maxHeight: isMobile ? "55vh" : provided.maxHeight,
    WebkitOverflowScrolling: "touch",
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 50,
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#2f2320",
  }),
  input: (provided) => ({
    ...provided,
    color: "#2f2320",
    fontSize: "16px",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#7a6159",
  }),
});

const Dropdown = ({
  options,
  onChange,
  isDisabled,
  selectedValue,
  className,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [menuPortalTarget, setMenuPortalTarget] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const syncMobileState = () => setIsMobile(mediaQuery.matches);

    syncMobileState();
    setMenuPortalTarget(document.body);
    mediaQuery.addEventListener("change", syncMobileState);

    return () => mediaQuery.removeEventListener("change", syncMobileState);
  }, []);

  return (
    <Select
      options={options}
      onChange={onChange}
      isDisabled={isDisabled}
      styles={getCustomStyles(isMobile)}
      instanceId={useId()}
      className={className}
      isSearchable={!isMobile}
      menuPlacement="auto"
      menuPosition={isMobile ? "fixed" : "absolute"}
      menuPortalTarget={isMobile ? menuPortalTarget : null}
      value={options.find(
        (option) =>
          option.label === selectedValue || option.value === selectedValue
      )}
    />
  );
};

export default Dropdown;
