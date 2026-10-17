import React from 'react';
import './TrustedPartners.css';

const TrustedPartners = () => {
  const partners = [
    { name: 'SOY', style: { fontFamily: 'serif', fontSize: '1.5rem' } },
    { name: 'chooose KIGALI', style: { fontFamily: 'sans-serif', fontWeight: '300' } },
    { name: 'PLANET BURGER', style: { fontFamily: 'sans-serif', fontWeight: '800', fontStyle: 'italic' } },
    { name: 'M HOTEL', style: { fontFamily: 'serif', fontSize: '1.2rem', letterSpacing: '2px' } },
    { name: 'CHEZ LANDO', style: { fontFamily: 'cursive', fontSize: '1.3rem' } },
    { name: 'SUNDOWNER', style: { fontFamily: 'sans-serif', letterSpacing: '3px' } },
  ];

  return (
    <section className="trusted-section">
      <div className="container">
        <p className="trusted-subtitle text-primary">TRUSTED BY FOOD LOVERS</p>
        
        <div className="trusted-logos">
          {partners.map((partner, index) => (
            <div key={index} className="partner-logo" style={partner.style}>
              {partner.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedPartners;
