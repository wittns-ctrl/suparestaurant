import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { restaurantsApi, usersApi, notificationsApi, adminApi, newsletterApi } from '../../services/api';
import DashboardLayout from '../../layouts/DashboardLayout/DashboardLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  BarChart2, Users, Store, CheckCircle, XCircle, Ban, TrendingUp,
  Bell, Settings, AlertCircle, ShieldCheck, UserCheck, UserX, RefreshCw, Send
} from 'lucide-react';
import '../customer/dashboard.css';

// ── Sidebar Config ─────────────────────────────────────────────────────────
export const adminSidebarConfig = [
  { id: 'overview', label: 'Dashboard Overview', icon: BarChart2 },
  {
    id: 'restaurants-group',
    label: 'Restaurant Management',
    icon: Store,
    subItems: [
      { id: 'approvals', label: 'Pending Approvals' },
      { id: 'restaurants', label: 'All Restaurants' },
    ],
  },
  {
    id: 'users-group',
    label: 'User Management',
    icon: Users,
    subItems: [
      { id: 'customers', label: 'Customers' },
      { id: 'owners', label: 'Restaurant Owners' },
    ],
  },
  { id: 'analytics', label: 'Platform Analytics', icon: TrendingUp },
  {
    id: 'system-group',
    label: 'System',
    icon: Settings,
    subItems: [
      { id: 'notifications', label: 'Notifications' },
      { id: 'newsletter', label: 'Newsletter' },
      { id: 'settings', label: 'Settings' },
    ],
  },
];

// ── Reusable SVG Bar Chart ─────────────────────────────────────────────────
const BarChartSVG = ({ data, color = 'var(--primary)', label }) => {
  const max = Math.max(1, ...data.map(d => Number(d.value) || 0));
  const w = 420, h = 160, padL = 40, padB = 30;
  const slotW = (w - padL) / Math.max(data.length, 1);
  const barW = Math.min(32, slotW * 0.68);
  return (
    <svg viewBox={`0 0 ${w} ${h + padB}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <line key={pct}
          x1={padL} y1={h - h * pct} x2={w} y2={h - h * pct}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const bh = ((Number(d.value) || 0) / max) * (h - 10);
        const x = padL + i * slotW + (slotW - barW) / 2;
        return (
          <g key={i}>
            <rect x={x} y={h - bh} width={barW} height={bh}
              fill={color} rx="4" opacity={i === data.length - 1 ? 1 : 0.55} />
            <text x={x + barW / 2} y={h + 18} textAnchor="middle"
              fill="rgba(255,255,255,0.4)" fontSize="10">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ── SVG Donut Chart ────────────────────────────────────────────────────────
const DonutChart = ({ segments }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (!total) {
    return <div style={{ width: 180, height: 180, flexShrink: 0, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet</div>;
  }
  let cumulative = 0;
  const r = 70, cx = 90, cy = 90, stroke = 22;
  const circumference = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 180 180" style={{ width: 180, height: 180, flexShrink: 0 }}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const offset = circumference - pct * circumference;
        const rotation = (cumulative / total) * 360 - 90;
        cumulative += seg.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${pct * circumference} ${(1 - pct) * circumference}`}
            strokeDashoffset={offset}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">
        {total.toLocaleString()}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">
        Total
      </text>
    </svg>
  );
};

// ── Line Sparkline ─────────────────────────────────────────────────────────
// ── Toast Notification ─────────────────────────────────────────────────────
const Toast = ({ message, type = 'success', onClose }) => (
  <div style={{
    position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
    background: type === 'success' ? 'var(--success)' : 'var(--error)',
    color: '#fff', padding: '0.85rem 1.25rem', borderRadius: '12px',
    fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    animation: 'fadeInUp 0.3s ease',
  }}>
    {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
    {message}
    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
  </div>
);

// ── Admin Overview ─────────────────────────────────────────────────────────
const AdminOverview = ({ setActiveTab, restaurants, users, overview, revenueData }) => {
  const pendingCount = restaurants.filter(r => r.status === 'pending').length;
  const activeRestaurants = restaurants.filter(r => r.status === 'active').length;
  const blockedUsers = users.filter(u => u.status === 'blocked').length;

  return (
    <>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform-wide overview and key metrics.</p>
      </div>

      <div className="overview-stat-grid">
        {[
          { label: 'Total Restaurants', value: (overview?.totalRestaurants ?? restaurants.length).toLocaleString(), sub: `${overview?.activeRestaurants ?? activeRestaurants} active`, color: 'var(--primary)' },
          { label: 'Total Users', value: (overview?.totalUsers ?? users.length).toLocaleString(), sub: `${overview?.blockedUsers ?? blockedUsers} blocked`, color: 'var(--success)' },
          { label: 'Total Orders', value: (overview?.totalOrders ?? 0).toLocaleString(), sub: `${(overview?.pendingOrders ?? 0).toLocaleString()} pending`, color: 'var(--fresh-accent)' },
          { label: 'Pending Approvals', value: (overview?.pendingRestaurants ?? pendingCount).toLocaleString(), sub: 'Needs review', color: 'var(--warning)' },
        ].map((stat, i) => (
          <div key={i} className="dash-panel overview-stat-card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="dash-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0 }}>Revenue Growth (Monthly)</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.25rem 0.6rem' }}>Delivered order revenue</span>
          </div>
          <BarChartSVG data={revenueData} color="var(--primary)" />
        </div>
        <div className="dash-panel">
          <h3 style={{ marginBottom: '1.25rem' }}>Pending Approvals</h3>
          {restaurants.filter(r => r.status === 'pending').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
              <p>All caught up!</p>
            </div>
          ) : (
            restaurants.filter(r => r.status === 'pending').slice(0, 3).map(r => (
              <div key={r.id} style={{ padding: '0.75rem', background: 'var(--dash-bg)', borderRadius: '10px', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.type} · {r.location}</div>
                </div>
                <button className="dash-btn-primary" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }} onClick={() => setActiveTab('approvals')}>Review</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="dash-panel">
          <h3 style={{ marginBottom: '1.25rem' }}>Account Summary</h3>
          {[
            ['Customers', overview?.totalCustomers],
            ['Restaurant owners', overview?.totalOwners],
            ['Blocked accounts', overview?.blockedUsers],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span><strong>{Number(value || 0).toLocaleString()}</strong>
            </div>
          ))}
        </div>
        <div className="dash-panel">
          <h3 style={{ marginBottom: '1.25rem' }}>Platform Activity</h3>
          {[
            ['Orders awaiting action', overview?.pendingOrders],
            ['Cancelled or rejected orders', overview?.cancelledOrders],
            ['Bookings', overview?.totalBookings],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span><strong>{Number(value || 0).toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ── Restaurant Approvals ───────────────────────────────────────────────────
const RestaurantApprovals = ({ restaurants, onApprove, onReject }) => {
  const pending = restaurants.filter(r => r.status === 'pending');
  return (
    <>
      <div className="page-header">
        <h1>Pending Approvals</h1>
        <p>Review and verify new restaurant applications.</p>
      </div>
      <div className="dash-panel">
        {pending.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--success)' }}>All applications reviewed!</h3>
            <p>No pending restaurant approvals at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pending.map(req => (
              <div key={req.id} className="list-row" style={{ alignItems: 'center', padding: '1.25rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '10px', background: 'var(--dash-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', fontSize: '1.2rem', flexShrink: 0, marginRight: '1rem' }}>
                  {req.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{req.name}</div>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--warning-soft)', color: 'var(--warning)', fontWeight: 600 }}>PENDING</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span>📍 {req.location}</span>
                    <span>🍽 {req.type}</span>
                    <span>📄 Docs: <strong style={{ color: req.docs === 'Verified' ? 'var(--success)' : 'var(--warning)' }}>{req.docs}</strong></span>
                    <span>🕐 {req.submitted}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="dash-btn-primary"
                    style={{ padding: '0.5rem 1.1rem', background: 'var(--success)', color: '#fff', borderColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => onApprove(req.id)}
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    className="dash-btn-outline"
                    style={{ padding: '0.5rem 1rem', color: 'var(--error)', borderColor: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => onReject(req.id)}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ── All Restaurants ────────────────────────────────────────────────────────
const AllRestaurants = ({ restaurants, onToggleStatus }) => (
  <>
    <div className="page-header">
      <h1>All Restaurants</h1>
      <p>Manage all active and suspended restaurants on the platform.</p>
    </div>
    <div className="dash-panel">
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
            {['Restaurant', 'Owner', 'Type', 'Status', 'Actions'].map(h => (
              <th key={h} style={{ padding: '0.9rem 0.75rem', fontWeight: 500, fontSize: '0.85rem' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {restaurants.filter(r => r.status !== 'pending').map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '1rem 0.75rem', fontWeight: 600 }}>{r.name}</td>
              <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>{r.owner}</td>
              <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>{r.type}</td>
              <td style={{ padding: '1rem 0.75rem' }}>
                <span style={{
                  fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600,
                  background: r.status === 'active' ? 'var(--success-soft)' : r.status === 'rejected' ? 'var(--error-soft)' : 'var(--warning-soft)',
                  color: r.status === 'active' ? 'var(--success)' : r.status === 'rejected' ? 'var(--error)' : 'var(--warning)',
                }}>
                  {r.status.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '1rem 0.75rem' }}>
                <button
                  className="dash-btn-outline"
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: r.status === 'active' ? 'var(--error)' : 'var(--success)', borderColor: r.status === 'active' ? 'var(--error)' : 'var(--success)' }}
                  onClick={() => onToggleStatus(r.id)}
                >
                  {r.status === 'active' ? <><Ban size={14} /> Suspend</> : <><CheckCircle size={14} /> Activate</>}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

// ── User Table (customers or owners) ──────────────────────────────────────
const UserTable = ({ users, type, onToggleBlock }) => {
  const filtered = users.filter(u => u.type === type);
  return (
    <>
      <div className="page-header">
        <h1>{type === 'customer' ? 'Customer' : 'Restaurant Owner'} Management</h1>
        <p>Manage {type === 'customer' ? 'customer' : 'owner'} accounts on the platform.</p>
      </div>
      <div className="dash-panel">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
              {['Name', 'Email', 'Joined', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.9rem 0.75rem', fontWeight: 500, fontSize: '0.85rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--warning))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', fontSize: '0.85rem', flexShrink: 0 }}>
                      {u.name.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>{u.email}</td>
                <td style={{ padding: '1rem 0.75rem', color: 'var(--text-muted)' }}>{u.joined}</td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 600, background: u.status === 'active' ? 'var(--success-soft)' : 'var(--error-soft)', color: u.status === 'active' ? 'var(--success)' : 'var(--error)' }}>
                    {u.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '1rem 0.75rem' }}>
                  <button
                    className="dash-btn-outline"
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: u.status === 'active' ? 'var(--error)' : 'var(--success)', borderColor: u.status === 'active' ? 'var(--error)' : 'var(--success)' }}
                    onClick={() => onToggleBlock(u.id)}
                  >
                    {u.status === 'active' ? <><UserX size={14} /> Block</> : <><UserCheck size={14} /> Unblock</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ── Platform Analytics ─────────────────────────────────────────────────────
const PlatformAnalytics = ({ overview, revenueData, restaurants }) => {
  const donutSegments = [
    { label: 'Active', value: restaurants.filter((r) => r.status === 'active').length, color: 'var(--success)' },
    { label: 'Pending', value: restaurants.filter((r) => r.status === 'pending').length, color: 'var(--warning)' },
    { label: 'Suspended / rejected', value: restaurants.filter((r) => ['suspended', 'rejected'].includes(r.status)).length, color: 'var(--error)' },
  ];
  return (
    <>
      <div className="page-header">
        <h1>Platform Analytics</h1>
        <p>Comprehensive reports and performance metrics.</p>
      </div>

      <div className="overview-stat-grid">
        {[
          { label: 'Delivered Revenue', value: `$${Number(overview?.totalRevenue || 0).toLocaleString()}`, detail: 'All time' },
          { label: 'Total Users', value: Number(overview?.totalUsers || 0).toLocaleString(), detail: `${Number(overview?.totalOwners || 0).toLocaleString()} restaurant owners` },
          { label: 'Total Orders', value: Number(overview?.totalOrders || 0).toLocaleString(), detail: `${Number(overview?.pendingOrders || 0).toLocaleString()} pending` },
          { label: 'Bookings', value: Number(overview?.totalBookings || 0).toLocaleString(), detail: `${Number(overview?.pendingRestaurants || 0).toLocaleString()} restaurant approvals pending` },
        ].map((kpi, i) => (
          <div key={i} className="dash-panel overview-stat-card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.4rem' }}>{kpi.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dash-accent)' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{kpi.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="dash-panel">
          <h3 style={{ marginBottom: '1.25rem' }}>Delivered Revenue (12 months)</h3>
          <BarChartSVG data={revenueData} color="var(--primary)" />
        </div>
        <div className="dash-panel">
          <h3 style={{ marginBottom: '1.25rem' }}>Restaurant Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <DonutChart segments={donutSegments} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {donutSegments.map((seg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{seg.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{seg.value.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dash-panel">
        <h3 style={{ marginBottom: '1.25rem' }}>Order Summary</h3>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          {Number(overview?.totalOrders || 0).toLocaleString()} orders recorded, including {Number(overview?.cancelledOrders || 0).toLocaleString()} cancelled or rejected orders.
        </p>
      </div>
    </>
  );
};

// ── Notifications Center ───────────────────────────────────────────────────
const traceLabel = (key) => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (letter) => letter.toUpperCase());

const traceValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const NotificationsCenter = ({ notifications, onDismiss }) => (
  <>
    <div className="page-header">
      <h1>Notifications Center</h1>
      <p>System alerts and administrative requests.</p>
    </div>
    <div className="dash-panel">
      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Bell size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p>No notifications.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map(n => (
            <div key={n.id} style={{ padding: '1rem 1.25rem', background: 'var(--dash-bg)', borderRadius: '12px', borderLeft: `4px solid ${n.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, color: n.color, marginBottom: '0.25rem', fontSize: '0.85rem' }}>{n.type}</div>
                <div style={{ color: 'var(--text-main)', marginBottom: '0.3rem', fontSize: '0.9rem' }}>{n.text}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.time}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1rem', marginTop: '0.45rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <span>Notification ID: <code>{n.id}</code></span>
                  {n.recipient && <span>Recipient: {n.recipient.name || 'Unknown'} ({n.recipient.accountType || 'account'}) · {n.recipient.email || n.recipient.id}</span>}
                </div>
                {n.details && Object.keys(n.details).length > 0 && (
                  <div style={{ marginTop: '0.8rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.035)' }}>
                    <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Event trace</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.45rem 1rem' }}>
                      {Object.entries(n.details).map(([key, value]) => (
                        <div key={key} style={{ minWidth: 0, fontSize: '0.78rem', overflowWrap: 'anywhere' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{traceLabel(key)}: </span>
                          <span style={{ color: 'var(--text-main)' }}>{traceValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => onDismiss(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  </>
);

// ── Settings ───────────────────────────────────────────────────────────────
const AdminSettings = ({ showToast }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);

  useEffect(() => {
    adminApi.settings()
      .then(setSettings)
      .catch((error) => showToast(error.message || 'Could not load platform settings.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const change = (field) => (event) => {
    const value = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await adminApi.updateSettings({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        commissionRate: settings.commissionRate,
        maxRestaurantsPerOwner: settings.maxRestaurantsPerOwner,
      });
      setSettings(saved);
      showToast('Platform settings saved.');
    } catch (error) {
      showToast(error.message || 'Could not save platform settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const recalculateRatings = async () => {
    setMaintenanceRunning(true);
    try {
      const result = await adminApi.maintenance('recalculate-ratings');
      showToast(result.message || 'Restaurant ratings recalculated.');
    } catch (error) {
      showToast(error.message || 'Could not recalculate restaurant ratings.', 'error');
    } finally {
      setMaintenanceRunning(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure platform-wide settings and preferences.</p>
      </div>
      {loading ? <div className="dash-panel">Loading platform settings…</div> : settings && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <form className="dash-panel" onSubmit={saveSettings}>
            <h3 style={{ marginBottom: '1.5rem' }}>Platform Configuration</h3>
            <div className="dash-form-group">
              <label htmlFor="admin-platform-name">Platform Name</label>
              <input id="admin-platform-name" className="dash-input" value={settings.platformName || ''} onChange={change('platformName')} required maxLength={100} />
            </div>
            <div className="dash-form-group">
              <label htmlFor="admin-support-email">Support Email</label>
              <input id="admin-support-email" type="email" className="dash-input" value={settings.supportEmail || ''} onChange={change('supportEmail')} required />
            </div>
            <div className="dash-form-group">
              <label htmlFor="admin-commission-rate">Commission Rate (%)</label>
              <input id="admin-commission-rate" type="number" min="0" max="100" step="0.1" className="dash-input" value={settings.commissionRate ?? 0} onChange={change('commissionRate')} required />
            </div>
            <div className="dash-form-group">
              <label htmlFor="admin-max-restaurants">Max Restaurants Per Owner</label>
              <input id="admin-max-restaurants" type="number" min="1" step="1" className="dash-input" value={settings.maxRestaurantsPerOwner ?? 3} onChange={change('maxRestaurantsPerOwner')} required />
            </div>
            <button className="dash-btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
          <div className="dash-panel">
            <h3 style={{ marginBottom: '0.5rem' }}>Maintenance</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>Run a supported maintenance task against platform data.</p>
            <div style={{ padding: '1rem', background: 'var(--dash-bg)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <RefreshCw size={20} color="var(--warning)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Recalculate restaurant ratings</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rebuild rating averages and review counts from submitted reviews.</div>
              </div>
              <button type="button" className="dash-btn-outline" disabled={maintenanceRunning} onClick={recalculateRatings}>
                {maintenanceRunning ? 'Running…' : 'Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const NewsletterComposer = ({ showToast }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await newsletterApi.sendUpdate(subject.trim(), message.trim());
      showToast(`Posted in the app for ${result.inAppSent} customers and restaurant owners; emailed ${result.sent} of ${result.total} newsletter subscribers${result.failed ? ` (${result.failed} email${result.failed === 1 ? '' : 's'} failed)` : ''}.`);
      setSubject('');
      setMessage('');
      setConfirming(false);
    } catch (err) {
      showToast(err.message || 'Could not send the newsletter update.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Newsletter</h1>
        <p>Post a message to customer and restaurant-owner notifications, and email people who subscribed from the site footer.</p>
      </div>
      <form className="dash-panel" onSubmit={(event) => { event.preventDefault(); setConfirming(true); }} style={{ maxWidth: 760 }}>
        <div className="dash-form-group">
          <label htmlFor="newsletter-subject">Subject</label>
          <input id="newsletter-subject" className="dash-input" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} required />
        </div>
        <div className="dash-form-group">
          <label htmlFor="newsletter-message">Update</label>
          <textarea id="newsletter-message" className="dash-input" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} rows={7} required />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '1rem' }}>This message will appear in the in-app notification center for every active customer and restaurant owner. Active newsletter subscribers also receive an email with an unsubscribe link.</p>
        <button type="submit" className="dash-btn-primary" disabled={sending} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Send size={16} /> Review and send
        </button>
      </form>
      {confirming && (
        <ConfirmDialog
          title="Send this SupaMeal update?"
          description={`“${subject.trim()}” will be posted to customer and restaurant-owner notifications and emailed to active newsletter subscribers.`}
          confirmLabel={sending ? 'Sending…' : 'Send update'}
          confirmDisabled={sending}
          tone="primary"
          Icon={Send}
          onConfirm={handleSend}
          onCancel={() => !sending && setConfirming(false)}
        />
      )}
    </>
  );
};

// ── Main Admin Dashboard ───────────────────────────────────────────────────
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);

  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [dataError, setDataError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const loadAdminData = async () => {
    setLoadingData(true);
    try {
      const [restData, userData, notifData, overviewData, revenue] = await Promise.all([
        restaurantsApi.adminList(),
        usersApi.list(),
        notificationsApi.list(),
        adminApi.overview(),
        adminApi.revenue('month'),
      ]);
      setRestaurants(restData.map(r => ({
        id: r.id || r._id, name: r.name, type: r.cuisine || r.type, location: r.location?.address || r.address,
        owner: r.owner, docs: r.docs, submitted: r.submitted ? new Date(r.submitted).toLocaleDateString() : '—', status: r.status,
      })));
      setUsers(userData.map(u => ({
        id: u.id || u._id, name: u.name || 'Unnamed user', email: u.email, joined: u.joined || '—', status: u.status || 'active', type: u.type || u.accountType,
      })));
      setNotifications(notifData.map(n => ({
        id: n.id || n._id, type: n.title || 'Notification', text: n.message, time: n.createdAt ? new Date(n.createdAt).toLocaleString() : n.time,
        details: n.details, recipient: n.recipient, color: n.isRead ? 'var(--text-muted)' : 'var(--primary)',
      })));
      setOverview(overviewData);
      setRevenueData(Array.isArray(revenue) ? revenue : []);
      setDataError('');
    } catch (err) {
      setDataError(err.message || 'Could not load admin portal data.');
    } finally {
      setLoadingData(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (id) => {
    try {
      await restaurantsApi.approve(id, true);
      await loadAdminData();
      showToast('Restaurant approved and activated!');
    } catch (error) { showToast(error.message || 'Could not approve restaurant.', 'error'); }
  };

  const handleReject = async (id) => {
    try {
      await restaurantsApi.approve(id, false);
      await loadAdminData();
      showToast('Restaurant application rejected.');
    } catch (error) { showToast(error.message || 'Could not reject restaurant.', 'error'); }
  };

  const handleToggleRestaurantStatus = async (id) => {
    const r = restaurants.find(x => x.id === id);
    const newStatus = r?.status === 'active' ? 'suspended' : 'active';
    try {
      await restaurantsApi.setStatus(id, newStatus);
      await loadAdminData();
      showToast('Restaurant status updated.');
    } catch (error) { showToast(error.message || 'Could not update restaurant status.', 'error'); }
  };

  const handleToggleBlock = async (id) => {
    const u = users.find(x => x.id === id);
    const newStatus = u?.status === 'active' ? 'blocked' : 'active';
    try {
      await usersApi.setStatus(id, newStatus);
      await loadAdminData();
      showToast('User status updated.');
    } catch (error) { showToast(error.message || 'Could not update user status.', 'error'); }
  };

  const handleDismissNotification = async (id) => {
    try {
      await notificationsApi.dismiss(id);
      await loadAdminData();
      showToast('Notification dismissed.');
    } catch (error) { showToast(error.message || 'Could not dismiss notification.', 'error'); }
  };

  const { isAuthenticated, user } = useAuth();
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    loadAdminData();
  }, [isAuthenticated, user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <AdminOverview setActiveTab={setActiveTab} restaurants={restaurants} users={users} overview={overview} revenueData={revenueData} />;
      case 'approvals': return <RestaurantApprovals restaurants={restaurants} onApprove={handleApprove} onReject={handleReject} />;
      case 'restaurants': return <AllRestaurants restaurants={restaurants} onToggleStatus={handleToggleRestaurantStatus} />;
      case 'customers': return <UserTable users={users} type="customer" onToggleBlock={handleToggleBlock} />;
      case 'owners': return <UserTable users={users} type="owner" onToggleBlock={handleToggleBlock} />;
      case 'analytics': return <PlatformAnalytics overview={overview} revenueData={revenueData} restaurants={restaurants} />;
      case 'notifications': return <NotificationsCenter notifications={notifications} onDismiss={handleDismissNotification} />;
      case 'newsletter': return <NewsletterComposer showToast={showToast} />;
      case 'settings': return <AdminSettings showToast={showToast} />;
      default: return <AdminOverview setActiveTab={setActiveTab} restaurants={restaurants} users={users} />;
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <DashboardLayout sidebarConfig={adminSidebarConfig} activeTab={activeTab} setActiveTab={setActiveTab} roleName="Admin">
        {dataError && <div role="alert" className="auth-form-error" style={{ margin: '1rem' }}>{dataError}</div>}
        {loadingData && !overview ? <div className="dash-panel">Loading admin data…</div> : renderContent()}
      </DashboardLayout>
    </>
  );
};

export default AdminDashboard;
