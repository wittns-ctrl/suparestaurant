import React from 'react';
import { Target, Heart, Shield } from 'lucide-react';
import './AboutUs.css';

const AboutUs = () => {
  return (
    <section id="about" className="about-us">
      <div className="container">
        <div className="about-grid">
          <div className="about-content">
            <p className="section-subtitle text-primary">OUR STORY</p>
            <h2 className="section-title">Bringing the Best <span className="text-primary">Dining Experiences</span> to You</h2>
            
            <p className="about-description">
              SupaMeal was founded with a simple vision: to bridge the gap between hungry customers and exceptional restaurants. 
              Whether you are looking for a romantic dinner table or craving a quick delivery to your doorstep, we make the process seamless.
            </p>
            
            <p className="about-description">
              Our platform empowers restaurant owners with state-of-the-art tools to manage their bookings and orders, ensuring you get the best service possible every single time.
            </p>
            
            <div className="about-values">
              <div className="value-item">
                <Target className="text-primary" size={24} />
                <span>Quality First</span>
              </div>
              <div className="value-item">
                <Heart className="text-primary" size={24} />
                <span>Customer Focus</span>
              </div>
              <div className="value-item">
                <Shield className="text-primary" size={24} />
                <span>Secure & Reliable</span>
              </div>
            </div>
          </div>
          
          <div className="about-images">
            <div className="about-img-main"></div>
            <div className="about-img-secondary"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
