import React from 'react';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import './HowItWorks.css';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      icon: Calendar,
      title: 'Choose Restaurant',
      description: 'Browse top restaurants and pick your favorite for dine-in or delivery.'
    },
    {
      number: '02',
      icon: Clock,
      title: 'Book or Order',
      description: 'Reserve a table with your details, or add meals to your cart.'
    },
    {
      number: '03',
      icon: CheckCircle,
      title: 'Confirm & Track',
      description: "Get instant confirmation and track your order's status in real-time."
    }
  ];

  return (
    <section className="how-it-works">
      <div className="container">
        <div className="section-header text-center">
          <p className="section-subtitle text-primary">HOW IT WORKS</p>
          <h2 className="section-title">Book in 3 Simple <span className="text-primary">Steps</span></h2>
        </div>

        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-icon-wrapper">
                <step.icon size={32} className="text-primary" />
              </div>
              <div className="step-content">
                <span className="step-number text-primary">{step.number}</span>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
              {index < steps.length - 1 && <div className="step-connector"></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
