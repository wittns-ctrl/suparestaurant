import appMockup from '../../assets/images/app_mockup.png';
import './AppDownload.css';

const AppDownload = () => {
  return (
    <section className="app-download">
      <div className="container app-download-container">
        <div className="app-content">
          <div className="app-badge">
            <span className="text-primary">📱</span> ON THE GO?
          </div>
          
          <h2 className="app-title">
            Download the <span className="text-primary">SupaMeal</span><br />
            App Now
          </h2>
          
          <p className="app-description">
            Book tables, discover restaurants, and enjoy exclusive<br />
            offers on the go.
          </p>
          
          <div className="store-buttons">
            <a href="#" className="store-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.36 14.08C16.38 10.66 19.34 9.17 19.46 9.1C17.96 6.88 15.61 6.55 14.81 6.46C12.83 6.25 10.9 7.64 9.87 7.64C8.85 7.64 7.27 6.49 5.62 6.5C3.49 6.52 1.54 7.76 0.44 9.68C-1.8 13.56 0.5 19.34 2.68 22.5C3.74 24.04 4.98 25.79 6.64 25.73C8.25 25.66 8.87 24.68 10.82 24.68C12.76 24.68 13.33 25.73 15.02 25.7C16.74 25.66 17.82 24.1 18.86 22.54C20.07 20.76 20.57 19.04 20.6 18.96C20.55 18.94 16.34 17.31 16.36 14.08Z"/>
                <path d="M13.25 4.31C14.13 3.25 14.73 1.77 14.57 0.29C13.3 0.35 11.72 1.15 10.81 2.22C10 3.17 9.29 4.69 9.48 6.13C10.9 6.24 12.37 5.41 13.25 4.31Z"/>
              </svg>
              <div className="store-btn-text">
                <span>Download on the</span>
                <strong>App Store</strong>
              </div>
            </a>
            
            <a href="#" className="store-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.37 22.75C1.19 22.58 1.09 22.31 1.09 21.94V2.06C1.09 1.69 1.19 1.42 1.37 1.25C1.56 1.08 1.84 1 2.21 1C2.5 1 2.8 1.09 3.09 1.27L18.47 10.1C18.95 10.38 19.2 10.68 19.2 11C19.2 11.32 18.95 11.62 18.47 11.9L3.09 20.73C2.8 20.91 2.5 21 2.21 21C1.84 21 1.56 20.92 1.37 22.75Z"/>
              </svg>
              <div className="store-btn-text">
                <span>GET IT ON</span>
                <strong>Google Play</strong>
              </div>
            </a>
          </div>
          <p className="app-coming-soon" role="status">Mobile app coming soon</p>
        </div>
        
        <div className="app-image-wrapper">
          <img src={appMockup} alt="SupaMeal App Mockup" className="app-mockup-image" />
        </div>
      </div>
    </section>
  );
};

export default AppDownload;
