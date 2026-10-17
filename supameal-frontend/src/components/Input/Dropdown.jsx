import './Dropdown.css';

const Dropdown = ({ options, value, onChange, placeholder = "Select option" }) => {
  return (
    <select
      className="native-dropdown"
      value={value || ''}
      aria-label={placeholder}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
};

export default Dropdown;
