import React, { useId } from "react";
import Select from "react-select";

const Dropdown = ({ options, onChange, isDisabled }) => {
    return (
        <Select options={options} onChange={onChange} instanceId={useId()} isDisabled={isDisabled} />
    );
};

export default Dropdown;
