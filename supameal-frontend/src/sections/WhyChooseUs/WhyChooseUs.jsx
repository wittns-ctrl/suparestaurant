import React from 'react';
import { Store, Zap, Clock, HeadphonesIcon } from 'lucide-react';
import './WhyChooseUs.css';

const WhyChooseUs = () => {
  const features = [
    {
      icon: Store,
      title: 'Handpicked Restaurants',
      description: 'Only the best places selected for you.'
    },
    {
      icon: Zap,
      title: 'Easy & Fast Booking',
      description: 'Book your table in just a few clicks.'
    },
    {
      icon: Clock,
      title: 'Real-Time Availability',
      description: 'Live updates for accurate and reliable bookings.'
    },
    {
      icon: HeadphonesIcon,
      title: '24/7 Support',
      description: "We're here to help you anytime, anywhere."
    }
  ];

  return (
    <section className="why-choose-us">
      <div className="container">
        <div className="section-header text-center">
          <p className="section-subtitle text-primary">WHY CHOOSE SUPAMEAL?</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon-wrapper">
                <feature.icon size={24} className="text-primary" />
              </div>
              <div className="feature-content">
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
