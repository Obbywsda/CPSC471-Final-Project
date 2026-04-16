import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { vehicleApi } from '../api';
import {
  BarChart3, TrendingUp, Download, Filter,
  Car, Wrench, DollarSign, Calendar,
} from 'lucide-react';

export default function Reports() {
  const { isMechanic } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vehicleApi.getAll().then(r => setVehicles(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const available = vehicles.filter(v => v.status === 'Available').length;
  const rented = vehicles.filter(v => v.status === 'Rented').length;
  const inMaint = vehicles.filter(v => v.status === 'In Maintenance').length;
  const onHold = vehicles.filter(v => v.status === 'On Hold').length;

  return (
    <Layout title={isMechanic ? 'Fleet Reports' : 'Concourse Reports'} badge={isMechanic ? 'MECH_VIEW' : undefined}>
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <div className="page-header__breadcrumb">Analytics</div>
            <h1 className="page-header__title">Fleet Reports</h1>
            <p className="page-header__subtitle">Overview of fleet performance, utilization, and maintenance metrics</p>
          </div>
          <div className="page-header__actions">
            <button className="btn btn--ghost"><Filter size={16} /> Filter</button>
            <button className="btn btn--secondary"><Download size={16} /> Export Report</button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card__top">
            <div className="stat-card__label">Total Fleet</div>
            <div className="stat-card__icon"><Car size={18} /></div>
          </div>
          <div className="stat-card__value">{vehicles.length}</div>
          <div className="stat-card__sub">Active vehicles in system</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__top">
            <div className="stat-card__label">Available</div>
            <div className="stat-card__icon" style={{ background: 'var(--success-container)', color: 'var(--success)' }}><Car size={18} /></div>
          </div>
          <div className="stat-card__value" style={{ color: 'var(--success)' }}>{available}</div>
          <div className="stat-card__sub">Ready for deployment</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__top">
            <div className="stat-card__label">In Service</div>
            <div className="stat-card__icon"><Wrench size={18} /></div>
          </div>
          <div className="stat-card__value">{inMaint + onHold}</div>
          <div className="stat-card__sub">Maintenance + On Hold</div>
        </div>
        <div className="stat-card stat-card--accent">
          <div className="stat-card__top">
            <div className="stat-card__label">Utilization Rate</div>
            <div className="stat-card__icon"><TrendingUp size={18} /></div>
          </div>
          <div className="stat-card__value">
            {vehicles.length > 0 ? Math.round((rented / vehicles.length) * 100) : 0}%
          </div>
          <div className="stat-card__sub">Currently rented</div>
        </div>
      </div>

      {/* Fleet Status Breakdown */}
      <div className="grid-8-4" style={{ marginBottom: 28 }}>
        <div className="card">
          <div className="card__header">
            <span className="card__header-title">Fleet Status Distribution</span>
          </div>
          <div className="card__body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <StatusBar label="Available" count={available} total={vehicles.length} color="var(--success)" />
              <StatusBar label="Rented" count={rented} total={vehicles.length} color="var(--primary)" />
              <StatusBar label="In Maintenance" count={inMaint} total={vehicles.length} color="var(--warning)" />
              <StatusBar label="On Hold" count={onHold} total={vehicles.length} color="var(--error)" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <span className="card__header-title">Key Metrics</span>
          </div>
          <div className="card__body">
            <div className="info-row">
              <span className="info-row__label">Avg. Odometer</span>
              <span className="info-row__value">
                {vehicles.length > 0 ? Math.round(vehicles.reduce((sum, v) => sum + (v.odometer || 0), 0) / vehicles.length).toLocaleString() : 0} km
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Avg. Vehicle Age</span>
              <span className="info-row__value">
                {vehicles.length > 0 ? (new Date().getFullYear() - Math.round(vehicles.reduce((sum, v) => sum + v.year, 0) / vehicles.length)).toFixed(1) : 0} yrs
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Fleet Value (MSRP)</span>
              <span className="info-row__value">
                ${vehicles.reduce((sum, v) => sum + parseFloat(v.msrp || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Locations</span>
              <span className="info-row__value">{new Set(vehicles.map(v => v.location_code)).size}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle List by Status */}
      <div className="card">
        <div className="card__header">
          <span className="card__header-title">Complete Fleet Registry</span>
        </div>
        <div className="card__body--full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Location</th>
                <th>Odometer</th>
                <th>MSRP</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.vin}>
                  <td style={{ fontWeight: 700 }}>{v.unit_number}</td>
                  <td>{v.year} {v.make} {v.model} {v.trim}</td>
                  <td>
                    <span className={`badge ${
                      v.status === 'Available' ? 'badge--active'
                      : v.status === 'Rented' ? 'badge--in-transit'
                      : v.status === 'On Hold' ? 'badge--hold'
                      : 'badge--maintenance'
                    }`}>{v.status}</span>
                  </td>
                  <td>{v.location_code}</td>
                  <td>{(v.odometer || 0).toLocaleString()}</td>
                  <td>${parseFloat(v.msrp || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{count} <span style={{ fontWeight: 400, color: 'var(--on-surface-variant)' }}>({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="progress-bar" style={{ height: 10 }}>
        <div className="progress-bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
