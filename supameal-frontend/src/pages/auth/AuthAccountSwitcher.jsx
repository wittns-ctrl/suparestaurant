import { NavLink } from 'react-router-dom';

const accountOptions = [
  { label: 'Customer', to: '/login', type: 'customer' },
  { label: 'Restaurant Owner', to: '/owner-login', type: 'owner' },
  { label: 'Admin', to: '/admin-login', type: 'admin' },
];

const AuthAccountSwitcher = ({ accountType }) => (
  <nav className="auth-account-switcher" aria-label="Choose sign-in account type">
    {accountOptions.map(({ label, to, type }) => (
      <NavLink
        key={type}
        to={to}
        className={`auth-account-switcher__option${accountType === type ? ' is-active' : ''}`}
        aria-current={accountType === type ? 'page' : undefined}
      >
        {label}
      </NavLink>
    ))}
  </nav>
);

export default AuthAccountSwitcher;
