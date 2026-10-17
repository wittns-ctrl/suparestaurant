import React from 'react';
import Logo from '../Logo/Logo';
import './Loader.css';

const Loader = ({ text = 'Preparing your experience...' }) => {
  return (
    <div className="loader-container">
      <div className="loader-brand">
        <Logo />
      </div>
      <div className="loader-ring-wrapper">
        <div className="loader-spinner-ring" />
        <div className="loader-spinner-ring loader-spinner-ring-inner" />
        <div className="loader-center-dot" />
      </div>
      <p className="loader-text">{text}</p>
      <p className="loader-subtext">SupaMeal · Discover · Book · Enjoy</p>
    </div>
  );
};

export default Loader;
