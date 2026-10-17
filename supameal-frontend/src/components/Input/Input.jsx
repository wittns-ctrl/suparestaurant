import React from 'react';
import './Input.css';

const Input = ({ icon: Icon, type = 'text', placeholder, className = '', ...props }) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {Icon && <Icon className="input-icon" size={18} />}
      <input type={type} className="input-field" placeholder={placeholder} {...props} />
    </div>
  );
};

export default Input;
