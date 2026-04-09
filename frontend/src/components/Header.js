import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehicleApi } from '../api';

function Header({ employee, vehicle, onVehicleSelect, isTasksPage }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSearchResults([]); setShowResults(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await vehicleApi.search(value);
        setSearchResults(data);
        setShowResults(true);
      } catch { setSearchResults([]); }
    }, 300);
  };

  const selectVehicle = (v) => {
    onVehicleSelect(v);
    setShowResults(false);
    setSearchQuery('');
    navigate(`/vehicle-history/${v.unit_number}`);
  };

  const clearVehicle = () => {
    onVehicleSelect(null);
    navigate('/');
  };

  const pageTitle = isTasksPage
    ? `No Current Task - ${employee.location}`
    : vehicle
      ? `Vehicle History - ${employee.location}`
      : `Vehicle Event Manager`;

  return (
    <header className="app-header">
      <div className="app-header__left">
        <button className="app-header__menu-btn" onClick={() => navigate('/')}>
          &#9776;
        </button>
        <div className="app-header__title">
          {pageTitle}
          <span>{employee.employee_id} - {employee.name}</span>
        </div>
      </div>
      <div className="app-header__search" ref={searchRef}>
        <span className="app-header__search-label">VIN</span>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search VIN / Unit# / Plate..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4,
              background: 'white', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              minWidth: 360, maxHeight: 320, overflowY: 'auto', zIndex: 200,
              border: '1px solid #dfe1e6'
            }}>
              {searchResults.map((v) => (
                <button
                  key={v.vin}
                  onClick={() => selectVehicle(v)}
                  style={{
                    display: 'block', width: '100%', padding: '12px 16px',
                    textAlign: 'left', background: 'none', border: 'none',
                    borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                    fontSize: '0.85rem', color: '#1a1a2e'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f4f5f7'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                >
                  <strong>{v.color} {v.year} {v.make} {v.model} {v.trim}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#5a5a7a', marginTop: 2 }}>
                    Unit: {v.unit_number} &nbsp;|&nbsp; VIN: {v.vin} &nbsp;|&nbsp; Plate: {v.plate || 'N/A'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {vehicle && (
          <button className="app-header__close" onClick={clearVehicle} title="Clear vehicle">
            &times;
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
