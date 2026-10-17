import { ArrowLeft, ArrowRight, BriefcaseBusiness, FileText, HelpCircle, Newspaper, ShieldCheck, Store } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../sections/Navbar/Navbar';
import Footer from '../sections/Footer/Footer';
import './FooterInfoPage.css';

const contactEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'mugishawitness15@gmail.com';
const careersEmail = import.meta.env.VITE_CAREERS_EMAIL || contactEmail;

const pages = {
  careers: {
    title: 'Careers at SupaMeal', eyebrow: 'COME BUILD WITH US', icon: BriefcaseBusiness,
    intro: 'We’re making it easier to discover great food and help local restaurants grow.',
    blocks: [
      { title: 'Interested in joining?', text: 'Tell us what you do and how you would like to contribute. We’ll keep your details and get in touch when a suitable opportunity opens.' },
    ],
    action: { label: 'Contact our team', to: `mailto:${careersEmail}?subject=SupaMeal%20careers` },
  },
  blog: {
    title: 'From the SupaMeal table', eyebrow: 'THE JOURNAL', icon: Newspaper,
    intro: 'Ideas for discovering restaurants, planning a great meal, and making the most of your time in Kigali.',
    blocks: [
      { title: 'A guide to a better dinner booking', text: 'Choose a time, check the details, and let the restaurant know what would make your visit special.' },
      { title: 'Meet the neighbourhood table', text: 'Explore local restaurants and find a new favourite close to home, work, or your next stop in the city.' },
      { title: 'Good food, fewer steps', text: 'Browse menus, discover available offers, and keep your orders together in one place.' },
    ],
    action: { label: 'Explore restaurants', to: '/restaurants' },
  },
  press: {
    title: 'SupaMeal in the press', eyebrow: 'NEWS & MEDIA', icon: Newspaper,
    intro: 'For interviews, company information, or media requests, contact the SupaMeal team.',
    blocks: [
      { title: 'Media enquiries', text: 'Please include your publication, deadline, and the details of your request so our team can respond.' },
    ],
    action: { label: 'Email press enquiries', to: `mailto:${contactEmail}?subject=SupaMeal%20press%20enquiry` },
  },
  help: {
    title: 'How can we help?', eyebrow: 'SUPPORT', icon: HelpCircle,
    intro: 'Find a quick answer or send our team a message.',
    blocks: [
      { title: 'Bookings', text: 'Choose a restaurant, date, time, and party size to request a table. You can review or cancel bookings from your customer dashboard.' },
      { title: 'Orders', text: 'Browse a restaurant menu, add items to your cart, and follow your order from your dashboard.' },
      { title: 'Your account', text: 'Sign in to manage your profile, bookings, saved restaurants, and orders.' },
    ],
    action: { label: 'Contact support', to: '/home#contact' },
  },
  resources: {
    title: 'Restaurant resources', eyebrow: 'FOR OUR PARTNERS', icon: Store,
    intro: 'SupaMeal helps restaurants manage their presence, menus, bookings, and customer orders.',
    blocks: [
      { title: 'Partner with SupaMeal', text: 'Register your restaurant to start the onboarding process and share your business details with our team.' },
      { title: 'Already a partner?', text: 'Sign in to update your restaurant profile, menu, and operations.' },
    ],
    action: { label: 'Partner with us', to: '/register-restaurant' },
    secondaryAction: { label: 'Restaurant login', to: '/owner-login' },
  },
  terms: {
    title: 'Terms & Conditions', eyebrow: 'USING SUPAMEAL', icon: FileText,
    intro: 'These terms describe the basic rules for using SupaMeal to discover restaurants, request bookings, and place orders.',
    blocks: [
      { title: 'Bookings and orders', text: 'Requests and orders are subject to restaurant availability and confirmation. Check the details shown before submitting. Restaurants may contact you about a booking or order.' },
      { title: 'Your account', text: 'Keep your sign-in details private and make sure the contact information on your account is current. You are responsible for activity performed through your account.' },
      { title: 'Offers and prices', text: 'Offer availability, eligibility, prices, and terms are set by the participating restaurant and may change. Check the offer details before placing an order or booking.' },
      { title: 'Need help?', text: 'If you have a question about these terms or a booking, contact the SupaMeal support team.' },
    ],
    action: { label: 'Contact support', to: '/home#contact' },
  },
  privacy: {
    title: 'Privacy Policy', eyebrow: 'YOUR INFORMATION', icon: ShieldCheck,
    intro: 'SupaMeal uses the information you provide to operate accounts, bookings, orders, and communications.',
    blocks: [
      { title: 'Information you provide', text: 'This may include your name, email address, account details, booking and order information, and messages you send to us.' },
      { title: 'How we use it', text: 'We use information to provide requested services, communicate about your account and transactions, improve the platform, and send newsletter updates when you subscribe.' },
      { title: 'Your choices', text: 'You can contact us to ask about your information or stop receiving newsletter emails. Do not include sensitive personal information in a contact message.' },
      { title: 'Questions', text: 'For privacy questions, contact our support team.' },
    ],
    action: { label: 'Contact support', to: `mailto:${contactEmail}?subject=SupaMeal%20privacy%20question` },
  },
};

export default function FooterInfoPage() {
  const { page: slug } = useParams();
  const page = pages[slug] || pages.help;
  const Icon = page.icon;
  const Action = page.action.to.startsWith('mailto:') ? 'a' : Link;
  const actionProps = page.action.to.startsWith('mailto:')
    ? { href: page.action.to }
    : { to: page.action.to };

  return (
    <>
    <Navbar />
    <main className="footer-info-page">
      <div className="footer-info-container">
        <Link className="footer-info-back" to="/home"><ArrowLeft size={17} /> Back to SupaMeal</Link>
        <article className="footer-info-card">
          <div className="footer-info-icon"><Icon size={24} /></div>
          <p className="footer-info-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="footer-info-intro">{page.intro}</p>
          <div className="footer-info-blocks">
            {page.blocks.map((block) => (
              <section key={block.title}>
                <h2>{block.title}</h2>
                <p>{block.text}</p>
              </section>
            ))}
          </div>
          <div className="footer-info-actions">
            <Action className="footer-info-primary" {...actionProps}>
              {page.action.label} <ArrowRight size={17} />
            </Action>
            {page.secondaryAction && <Link className="footer-info-secondary" to={page.secondaryAction.to}>{page.secondaryAction.label}</Link>}
          </div>
        </article>
      </div>
    </main>
    <Footer />
    </>
  );
}
