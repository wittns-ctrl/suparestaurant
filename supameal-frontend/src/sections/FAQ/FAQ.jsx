import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './FAQ.css';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(-1);

  const faqs = [
    {
      question: "How do I book a table on SupaMeal?",
      answer: "Simply search for a restaurant, select your preferred date, time, and number of guests, and hit 'Find a Table'. Once you confirm, your reservation is instantly sent to the restaurant."
    },
    {
      question: "Can I order food for delivery?",
      answer: "Yes! SupaMeal allows you to view menus, add items to your cart, and place orders for delivery right to your doorstep."
    },
    {
      question: "Are there any hidden fees?",
      answer: "No. We believe in complete transparency. What you see on the menu or booking screen is what you pay. Any delivery charges will be clearly displayed before checkout."
    },
    {
      question: "How do I register my restaurant?",
      answer: "Click on 'For Owners' in the navigation menu and select 'Partner with Us'. You'll get access to a powerful dashboard to manage your menu, orders, and bookings."
    },
    {
      question: "Can I cancel a booking or order?",
      answer: "Bookings can be cancelled from your account dashboard up to 2 hours before the scheduled time. For food orders, cancellations are only possible before the restaurant starts preparing your meal."
    }
  ];

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section id="faq" className="faq-section">
      <div className="container">
        <div className="section-header text-center faq-header">
          <p className="section-subtitle text-primary">GOT QUESTIONS?</p>
          <h2 className="section-title">Frequently Asked <span className="text-primary">Questions</span></h2>
        </div>

        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`faq-item ${openIndex === index ? 'active' : ''}`}
              onClick={() => toggleAccordion(index)}
            >
              <div className="faq-question">
                <h3>{faq.question}</h3>
                {openIndex === index ? <ChevronUp className="text-primary" /> : <ChevronDown className="text-muted" />}
              </div>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
