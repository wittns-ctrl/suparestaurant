import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart2, ListOrdered, Edit3 } from 'lucide-react';
import Button from '../../components/Button/Button';
import './ForOwners.css';

const ForOwners = () => {
  return (
    <section className="for-owners">
      <div className="container owners-container">
        <div className="owners-content">
          <div className="owners-badge">
            <span className="text-primary">💼</span> RESTAURANT PARTNERS
          </div>
          
          <h2 className="owners-title">
            Manage Your Restaurant<br />
            with <span className="text-primary">SupaMeal</span>
          </h2>
          
          <p className="owners-description">
            Join our platform to reach more customers. Get access to a powerful dashboard 
            to manage your menu, track incoming orders, and handle table reservations in real-time.
          </p>
          
          <div className="owners-features">
            <div className="owner-feature">
              <ListOrdered className="text-primary" size={24} />
              <div>
                <strong>Manage Orders & Bookings</strong>
                <p>Accept, prepare, and track seamlessly.</p>
              </div>
            </div>
            <div className="owner-feature">
              <Edit3 className="text-primary" size={24} />
              <div>
                <strong>Menu Management</strong>
                <p>Update prices, items, and availability instantly.</p>
              </div>
            </div>
            <div className="owner-feature">
              <BarChart2 className="text-primary" size={24} />
              <div>
                <strong>Analytics Dashboard</strong>
                <p>Track your revenue, peak hours, and popular meals.</p>
              </div>
            </div>
          </div>
          
          <div className="owners-actions">
            <Link to="/register-restaurant">
              <Button variant="primary">
                Register Restaurant <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/owner-login">
              <Button variant="outline">
                Owner Login
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="owners-image-placeholder">
          <div className="dashboard-mockup">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="mockup-title">Owner Dashboard</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-sidebar"></div>
              <div className="mockup-content">
                <div className="mockup-cards">
                  <div className="mockup-card"></div>
                  <div className="mockup-card"></div>
                  <div className="mockup-card"></div>
                </div>
                <div className="mockup-chart"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForOwners;
