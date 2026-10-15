import React, { useId } from "react";
import Select from "react-select";

const customStyles = {
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
    padding: "0.75rem 1rem",
    color: state.isSelected ? "white" : "#332724",
    backgroundColor: state.isSelected
      ? "#b52326"
      : state.isFocused
      ? "#f8efec"
      : "white",
    "&:active": {
      backgroundColor: state.isSelected ? "#9e1f22" : "#f3dfd9",
    },
  }),
  // above modals (z-60), when the menu is drawn at page level
  menuPortal: (provided) => ({ ...provided, zIndex: 80 }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "0.75rem",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(47, 35, 32, 0.12)",
    border: "1px solid #eaded8",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#2f2320",
  }),
  input: (provided) => ({
    ...provided,
    color: "#2f2320",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#7a6159",
  }),
  multiValue: (provided) => ({
    ...provided,
    borderRadius: "999px",
    backgroundColor: "#fbeeec",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#5b1f20",
    fontWeight: 600,
    paddingLeft: "0.6rem",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    borderRadius: "999px",
    color: "#8f2e31",
    "&:hover": { backgroundColor: "#f3dcd8", color: "#5b1f20" },
  }),
};

// compact: a small control for toolbar choices (a table's View, entries)
const compactStyles = {
  ...customStyles,
  control: (provided, state) => ({
    ...customStyles.control(provided, state),
    minHeight: "36px",
    borderRadius: "0.6rem",
    fontSize: "0.875rem",
    fontWeight: 700,
  }),
  valueContainer: (provided) => ({ ...provided, padding: "0 0.5rem" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (provided) => ({ ...provided, padding: "0 0.4rem" }),
  option: (provided, state) => ({
    ...customStyles.option(provided, state),
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
  }),
};

const Dropdown = ({
  options,
  onChange,
  isDisabled,
  selectedValue,
  className,
  isClearable = false,
  placeholder,
  isSearchable = true,
  // react-select keeps the chosen value painted behind the text you type, so a
  // long list reads as "All states" with a cursor blinking over it. Opt in to
  // hiding the value while the menu is open, so typing looks like typing.
  // Off by default: the nine existing call sites rely on the value staying put.
  hideValueWhileSearching = false,
  // optional custom option renderer, passed straight to react-select —
  // the home chooser uses it to tint one keyword per option
  formatOptionLabel,
  // custom search matching (e.g. the site-wide selectFilter)
  filterOption,
  // draw the menu at page level, so a scrolling box (a modal) can't clip it
  menuAtPageLevel = false,
  // several choices: selectedValue is then an array of values
  isMulti = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <Select
      options={options}
      onChange={onChange}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={isSearchable}
      styles={compact ? compactStyles : customStyles}
      isMulti={isMulti}
      closeMenuOnSelect={!isMulti}
      instanceId={useId()}
      className={className}
      formatOptionLabel={formatOptionLabel}
      {...(filterOption ? { filterOption } : {})}
      {...(menuAtPageLevel && typeof document !== "undefined"
        ? { menuPortalTarget: document.body, menuPosition: "fixed" }
        : {})}
      onMenuOpen={() => setIsOpen(true)}
      onMenuClose={() => setIsOpen(false)}
      controlShouldRenderValue={!(hideValueWhileSearching && isOpen)}
      placeholder={
        hideValueWhileSearching && isOpen ? "Type to search…" : placeholder
      }
      value={
        isMulti
          ? options.filter((option) =>
              (selectedValue || []).includes(option.value)
            )
          : // grouped options ({ label, options }) hold their choices one level down
            options
              .flatMap((option) => option.options || [option])
              .find(
                (option) =>
                  option.label === selectedValue ||
                  option.value === selectedValue
              ) ?? null
      }
    />
  );
};

export default Dropdown;
