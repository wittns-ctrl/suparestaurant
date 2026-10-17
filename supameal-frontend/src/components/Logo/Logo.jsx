import React from 'react';
import './Logo.css';

const Logo = ({ className = '' }) => {
  return (
    <div className={`logo-container ${className}`}>
      <span className="logo-text">Supa<span className="text-primary">Meal</span></span>
    </div>
  );
};

export default Logo;
