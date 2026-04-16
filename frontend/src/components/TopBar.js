import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { vehicleApi } from '../api';
import { Search, Bell, HelpCircle, LogOut } from 'lucide-react';

export default function TopBar({ title, badge }) {
  const { user, isMechanic, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    if (debounce.current) clearTimeout(debounce.current);
    if (!val.trim()) { setResults([]); setShowResults(false); return; }
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await vehicleApi.search(val);
        setResults(data);
        setShowResults(true);
      } catch { setResults([]); }
    }, 300);
  };

  const selectVehicle = (v) => {
    setShowResults(false);
    setQuery('');
    navigate(`/fleet/${v.vin}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const placeholder = isMechanic
    ? 'Search VIN or Asset ID...'
    : 'Search vehicle records...';

  return (
    <header className="topbar">
      <div className="topbar__left">
        <span className="topbar__title">{title || 'Concourse Fleet'}</span>
        {badge && <span className="topbar__badge">{badge}</span>}
      </div>

      <div className="topbar__search" ref={searchRef}>
        <Search className="topbar__search-icon" />
        <input
          className="topbar__search-input"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {showResults && results.length > 0 && (
          <div className="search-dropdown">
            {results.map((v) => (
              <button key={v.vin} className="search-result" onClick={() => selectVehicle(v)}>
                <div className="search-result__main">
                  {v.year} {v.make} {v.model} {v.trim}
                </div>
                <div className="search-result__sub">
                  Unit: {v.unit_number} | VIN: {v.vin} | Plate: {v.plate || 'N/A'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="topbar__right">
        <button className="topbar__icon-btn">
          <Bell />
          <span className="topbar__notification-dot" />
        </button>
        <button className="topbar__icon-btn">
          <HelpCircle />
        </button>
        <div className="topbar__user" onClick={handleLogout} title="Switch role">
          <div className="topbar__user-info">
            <div className="topbar__user-name">{user?.name}</div>
            <div className="topbar__user-role">{user?.title}</div>
          </div>
          <div className="topbar__avatar">
            {user?.name?.split(' ').map(n => n[0]).join('') || '?'}
          </div>
        </div>
        <button className="topbar__icon-btn" onClick={handleLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
