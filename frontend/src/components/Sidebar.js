import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Truck,
  Wrench,
  CalendarDays,
  Settings,
  HelpCircle,
  Plus,
  Car,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fleet', label: 'Fleet Inventory', icon: Truck },
  { path: '/maintenance', label: 'Maintenance', icon: Wrench },
  { path: '/reservations', label: 'Reservations', icon: CalendarDays },
];

export default function Sidebar() {
  const { config, isMechanic } = useAuth();
  const location = useLocation();
  const navItems = isMechanic
    ? NAV_ITEMS.filter(({ path }) => path !== '/reservations')
    : NAV_ITEMS;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Car size={20} />
        </div>
        <div className="sidebar__brand-text">
          <h2>{config?.sidebarTitle || 'VEM'}</h2>
          <span>{config?.sidebarSubtitle || 'VEM'}</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `sidebar__link ${isActive || location.pathname.startsWith(path) ? 'sidebar__link--active' : ''}`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__spacer" />

      {!isMechanic && (
        <NavLink to="/reservations" className="sidebar__cta">
          <Plus size={16} />
          New Reservation
        </NavLink>
      )}

      {isMechanic && (
        <NavLink to="/maintenance" className="sidebar__cta">
          <Plus size={16} />
          Open Service Queue
        </NavLink>
      )}

      <div className="sidebar__bottom">
        <button className="sidebar__link">
          <Settings size={20} />
          Settings
        </button>
        <button className="sidebar__link">
          <HelpCircle size={20} />
          Support
        </button>
      </div>
    </aside>
  );
}
