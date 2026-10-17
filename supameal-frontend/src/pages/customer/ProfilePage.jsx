import { useEffect, useState } from 'react';
import { User, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/api';
import './dashboard.css';

const getProfileForm = (user) => ({
  firstName: user?.name?.split(' ')[0] || '',
  lastName: user?.name?.split(' ').slice(1).join(' ') || '',
  email: user?.email || '',
  phone: user?.phone ? String(user.phone) : '',
  deliveryAddress: user?.deliveryAddress?.street || '',
});

const getAvatarLabel = (name) => {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(() => getProfileForm(user));
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || user?.name || 'Customer';
  const avatarLabel = getAvatarLabel(displayName);

  useEffect(() => {
    setProfile(getProfileForm(user));
  }, [user?.id, user?.name, user?.email, user?.phone, user?.deliveryAddress?.street]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const newName = `${profile.firstName} ${profile.lastName}`.trim();
      // Only whitelisted profile fields — user.profile is a mongoose subdoc
      // whose _id would trip forbidNonWhitelisted and 400 the whole PATCH.
      const updated = await usersApi.update(user.id, {
        name: newName,
        email: profile.email,
        phone: profile.phone.trim(),
        deliveryAddress: { street: profile.deliveryAddress },
      });
      updateUser({
        ...updated,
        name: newName,
        email: profile.email,
        phone: profile.phone,
        deliveryAddress: { street: profile.deliveryAddress },
      });
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setMessage('');
    setError('');
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!passwords.currentPassword || !passwords.newPassword) {
      setError('Please fill in all password fields');
      return;
    }
    setLoading(true);
    try {
      await usersApi.changePassword(user.id, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setMessage('Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information and security settings.</p>
      </div>

      {message && <p style={{ color: 'var(--success)', marginBottom: '1rem', fontWeight: 600 }}>{message}</p>}
      {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', fontWeight: 600 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        <div>
          <div className="dash-panel" style={{ textAlign: 'center' }}>
            <div style={{ position:'relative', display:'inline-block', marginBottom:'1rem' }}>
              <div className="profile-summary-avatar">
                {avatarLabel}
              </div>
            </div>
            <div style={{ fontWeight:700, color:'var(--text-main)', fontSize:'1.1rem' }}>{displayName}</div>
            <div style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'0.25rem' }}>{profile.email || user?.email}</div>
            <div style={{ marginTop:'0.75rem', background:'var(--dash-accent-dim,rgba(198,241,53,0.12))', borderRadius:8, padding:'0.4rem 0.8rem', display:'inline-block', color:'var(--dash-accent)', fontSize:'0.8rem', fontWeight:600 }}>Customer</div>
            <div style={{ marginTop:'1rem', color:'var(--text-muted)', fontSize:'0.8rem' }}>Member since {user?.joined || '2026'}</div>
          </div>

          <div className="dash-panel">
            <div className="tab-bar" style={{ flexDirection:'column', border:'none' }}>
              <button className={`tab-btn ${tab==='profile'?'active':''}`} style={{ textAlign:'left', borderBottom:'none', borderLeft: tab==='profile' ? '2px solid var(--dash-accent)' : '2px solid transparent', borderRadius:0, paddingLeft:'1rem' }} onClick={() => setTab('profile')}>
                <User size={16} style={{marginRight:8}} /> Edit Profile
              </button>
              <button className={`tab-btn ${tab==='password'?'active':''}`} style={{ textAlign:'left', borderBottom:'none', borderLeft: tab==='password' ? '2px solid var(--dash-accent)' : '2px solid transparent', borderRadius:0, paddingLeft:'1rem' }} onClick={() => setTab('password')}>
                <Lock size={16} style={{marginRight:8}} /> Change Password
              </button>
            </div>
          </div>
        </div>

        <div className="dash-panel">
          {tab === 'profile' && (
            <>
              <h3 style={{ color:'var(--text-main)', marginBottom:'1.75rem', fontWeight:600 }}>Update Profile Information</h3>
              <div className="dash-form-group">
                <label>Profile Initials</label>
                <div className="profile-avatar-editor">
                  <div className="profile-avatar-preview">
                    {avatarLabel}
                  </div>
                  <div className="profile-avatar-actions">
                    <p>Your initials are generated automatically from your first and last name.</p>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="dash-form-group">
                  <label>First Name</label>
                  <input className="dash-input" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="dash-form-group">
                  <label>Last Name</label>
                  <input className="dash-input" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="dash-form-group">
                <label>Email Address</label>
                <input className="dash-input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="dash-form-group">
                <label>Phone Number</label>
                <input className="dash-input" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="dash-form-group">
                <label>Delivery Address</label>
                <input className="dash-input" value={profile.deliveryAddress} onChange={e => setProfile(p => ({ ...p, deliveryAddress: e.target.value }))} />
              </div>
              <button className="dash-btn-primary" onClick={handleSaveProfile} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
          {tab === 'password' && (
            <>
              <h3 style={{ color:'var(--text-main)', marginBottom:'1.75rem', fontWeight:600 }}>Change Password</h3>
              <div className="dash-form-group">
                <label>Current Password</label>
                <input className="dash-input" type="password" value={passwords.currentPassword} onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} />
              </div>
              <div className="dash-form-group">
                <label>New Password</label>
                <input className="dash-input" type="password" value={passwords.newPassword} onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))} />
              </div>
              <div className="dash-form-group">
                <label>Confirm New Password</label>
                <input className="dash-input" type="password" value={passwords.confirmPassword} onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))} />
              </div>
              <button className="dash-btn-primary" onClick={handleChangePassword} disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
