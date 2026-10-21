import Navbar from '../sections/Navbar/Navbar';
import Hero from '../sections/Hero/Hero';
import TrustedPartners from '../sections/TrustedPartners/TrustedPartners';
import HowItWorks from '../sections/HowItWorks/HowItWorks';
import TopPicks from '../sections/TopPicks/TopPicks';
import AboutUs from '../sections/AboutUs/AboutUs';
import WhyChooseUs from '../sections/WhyChooseUs/WhyChooseUs';
import ForOwners from '../sections/ForOwners/ForOwners';
import AppDownload from '../sections/AppDownload/AppDownload';
import FAQ from '../sections/FAQ/FAQ';
import ContactUs from '../sections/ContactUs/ContactUs';
import Footer from '../sections/Footer/Footer';

const LandingPage = () => {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustedPartners />
        <HowItWorks />
        <TopPicks />
        <AboutUs />
        <WhyChooseUs />
        <ForOwners />
        <AppDownload />
        <FAQ />
        <ContactUs />
      </main>
      <Footer />
    </>
  );
};

export default LandingPage;
