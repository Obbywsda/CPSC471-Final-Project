import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { vehicleApi, eventApi } from '../api';
import { formatDate, formatNumber, getEventLabel, getEventSummary, getVehicleStatusClass } from '../utils/formatters';
import {
  Edit3, MoreHorizontal, Printer, Plus, Eye,
  TrendingUp, AlertTriangle, Wrench as WrenchIcon, Fuel, ChevronRight,
} from 'lucide-react';

export default function Dashboard() {
  const { isMechanic, canEdit } = useAuth();
  return isMechanic ? <MechanicDashboard /> : <ManagerDashboard canEdit={canEdit} />;
}

/* ============================================= */
/* MANAGER / EMPLOYEE DASHBOARD                  */
/* ============================================= */
function ManagerDashboard({ canEdit }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await vehicleApi.getAll();
        setVehicles(data);
        if (data.length > 0) {
          setSelectedVehicle(data[0]);
          const evtRes = await eventApi.getByVehicle(data[0].vin);
          setEvents(evtRes.data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const selectVehicle = async (v) => {
    setSelectedVehicle(v);
    try {
      const evtRes = await eventApi.getByVehicle(v.vin);
      setEvents(evtRes.data);
    } catch {}
  };

  if (loading) return <Layout title="Concourse Fleet"><div className="loading-state">Loading dashboard...</div></Layout>;

  const v = selectedVehicle;
  const healthScore = v ? Math.min(100, Math.max(50, 100 - Math.floor((v.odometer || 0) / 1000))) : 94;
  const recentEvents = events.slice(0, 3);
  const latestInspection = events.find((event) => event.event_type === 'condition_check');
  const openIssues = events.filter((event) => event.event_type === 'hold' || event.event_type === 'maintenance').length;
  const reportedDamages = events.reduce((count, event) => count + (Number(event.damage_count) || 0), 0);

  return (
    <Layout title="Concourse Fleet">
      {v && (
        <>
          {/* Vehicle Header */}
          <div className="vehicle-header">
            <div className="vehicle-header__main">
              <div className="vehicle-header__badges">
                <span className="badge badge--active">ACTIVE</span>
                {v.status === 'Available' && <span className="badge badge--optimal">OPTIMAL</span>}
                {v.status === 'On Hold' && <span className="badge badge--hold">ON HOLD</span>}
                {v.status === 'In Maintenance' && <span className="badge badge--maintenance">MAINTENANCE</span>}
                {v.status === 'Rented' && <span className="badge badge--in-transit">RENTED</span>}
              </div>
              <h1 className="vehicle-header__title">{v.year} {v.make} {v.model}</h1>
              <p className="vehicle-header__subtitle">
                Unit #{v.unit_number} &bull; VIN: {v.vin.substring(0, 11)}...
              </p>
              <div className="page-header__actions" style={{ marginBottom: 16 }}>
                {canEdit && (
                  <button className="btn btn--primary" onClick={() => navigate(`/fleet/${v.vin}`)}>
                    <Edit3 size={16} /> Edit Details
                  </button>
                )}
                <button className="btn btn--ghost"><MoreHorizontal size={16} /></button>
              </div>
              <div className="vehicle-header__stats">
                <div>
                  <div className="vehicle-header__stat-label">Odometer</div>
                  <div className="vehicle-header__stat-value">{formatNumber(v.odometer)} <span>km</span></div>
                </div>
                <div>
                  <div className="vehicle-header__stat-label">Next PM Due</div>
                  <div className="vehicle-header__stat-value">{formatNumber(v.next_pm)} <span>km</span></div>
                </div>
                <div>
                  <div className="vehicle-header__stat-label">Last Inspection</div>
                  <div className="vehicle-header__stat-value">
                    {latestInspection ? formatDate(latestInspection.timestamp, { month: 'short', day: 'numeric', year: 'numeric' }) : formatDate(v.in_service_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
            <div className="score-card" style={{ minWidth: 200 }}>
              <div className="score-card__label">Fleet Health Index</div>
              <div className="score-card__value">{healthScore}<span>%</span></div>
              <div className="score-card__desc">
                {healthScore >= 90 ? 'Your fleet is operating above regional efficiency benchmarks.' : 'Below optimal range. Attention recommended.'}
              </div>
              <div className="score-card__bar">
                <div className="score-card__bar-fill" style={{ width: `${healthScore}%` }} />
              </div>
            </div>
          </div>

          {/* Condition Map + Activity Log */}
          <div className="grid-8-4" style={{ marginBottom: 28 }}>
            <div className="card">
              <div className="card__header">
                <span className="card__header-title">Vehicle Condition Diagram</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--error)', display: 'inline-block' }} />
                    Damage
                  </span>
                  <span style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                    Inspection Note
                  </span>
                </div>
              </div>
              <div className="card__body">
                <div className="condition-map">
                  <div className="condition-map__placeholder">
                    {reportedDamages > 0 ? `${reportedDamages} reported damage item${reportedDamages === 1 ? '' : 's'}` : 'No damage reports logged for this vehicle'}
                  </div>
                  {reportedDamages > 0 && <div className="condition-dot condition-dot--damage" style={{ top: '40%', left: '30%' }}>{reportedDamages}</div>}
                  {latestInspection && <div className="condition-dot condition-dot--inspection" style={{ bottom: '25%', right: '35%' }}>{latestInspection.damage_count || 0}</div>}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card__header">
                <span className="card__header-title">Recent Activity Log</span>
              </div>
              <div className="card__body">
                <div className="activity-log">
                  {recentEvents.length > 0 ? recentEvents.map((evt, i) => (
                    <div className="activity-item" key={evt.event_id || i}>
                      <div className={`activity-item__icon ${
                        evt.event_type === 'maintenance' ? 'activity-item__icon--maintenance'
                        : evt.event_type === 'hold' ? 'activity-item__icon--alert'
                        : 'activity-item__icon--fuel'
                      }`}>
                        {evt.event_type === 'maintenance' ? <WrenchIcon size={16} /> 
                         : evt.event_type === 'hold' ? <AlertTriangle size={16} />
                         : <Fuel size={16} />}
                      </div>
                      <div className="activity-item__content">
                        <div className="activity-item__title">{getEventLabel(evt)}</div>
                        <div className="activity-item__desc">
                          {getEventSummary(evt)}
                          {evt.location_name && ` | ${evt.location_name}`}
                          {evt.odometer && ` | ${formatNumber(evt.odometer)} km`}
                        </div>
                      </div>
                      <div className="activity-item__date">
                        {formatDate(evt.timestamp, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
                      No recent activity
                    </div>
                  )}
                  {recentEvents.length > 0 && (
                    <button
                      style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, padding: '8px 0', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => navigate(`/fleet/${v.vin}`)}
                    >
                      View Full History <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fleet Inventory Table */}
      <div className="card">
        <div className="card__header">
          <span className="card__header-title">Fleet Inventory Management</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--ghost">Filter</button>
            {canEdit && (
              <button className="btn btn--primary" onClick={() => navigate('/fleet')}>
                <Plus size={16} /> Add Vehicle
              </button>
            )}
          </div>
        </div>
        <div className="card__body--full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit #</th>
                <th>Vehicle</th>
                <th>VIN / Plate</th>
                <th>Odometer (km)</th>
                <th>Next PM Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((veh) => (
                <tr key={veh.vin} style={{ cursor: 'pointer' }} onClick={() => selectVehicle(veh)}>
                  <td style={{ fontWeight: 600 }}>{veh.unit_number}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{veh.year} {veh.make} {veh.model}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{veh.trim || veh.car_class || 'Fleet vehicle'}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
                      {veh.plate || `${veh.vin.substring(0, 6)}...`}
                    </span>
                  </td>
                  <td>{formatNumber(veh.odometer)}</td>
                  <td>{formatNumber(veh.next_pm)}</td>
                  <td>
                    <span className={`badge ${getVehicleStatusClass(veh.status)}`}>
                      {veh.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn--ghost" onClick={(e) => { e.stopPropagation(); navigate(`/fleet/${veh.vin}`); }}>
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit && (
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn--primary" disabled>
              {openIssues > 0 ? `${openIssues} open issue${openIssues === 1 ? '' : 's'} in history` : 'Fleet record synced'}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

/* ============================================= */
/* MECHANIC DASHBOARD                            */
/* ============================================= */
function MechanicDashboard() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await vehicleApi.getAll();
        setVehicles(data);
        if (data.length > 0) {
          const first = data.find(v => v.status === 'In Maintenance') || data[0];
          setSelectedVehicle(first);
          const evtRes = await eventApi.getByVehicle(first.vin);
          setEvents(evtRes.data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Layout title="Concourse Fleet"><div className="loading-state">Loading dashboard...</div></Layout>;

  const v = selectedVehicle;
  const healthScore = v ? Math.min(100, Math.max(50, 100 - Math.floor((v.odometer || 0) / 1000))) : 82;
  const needsService = v && (v.status === 'In Maintenance' || v.status === 'On Hold');

  return (
    <Layout title="Concourse Fleet" badge="MECH_VIEW">
      {v && (
        <>
          {/* Vehicle Header */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              {needsService && <span className="badge badge--service-required" style={{ marginBottom: 8, display: 'inline-flex' }}>SERVICE REQUIRED</span>}
              <h1 className="vehicle-header__title">{v.year} {v.make} {v.model}</h1>
              <p className="vehicle-header__subtitle">
                Asset ID: {v.unit_number} | VIN: {v.vin}
              </p>
              <div className="vehicle-header__stats" style={{ marginTop: 16 }}>
                <div>
                  <div className="vehicle-header__stat-label">Odometer</div>
                  <div className="vehicle-header__stat-value">{formatNumber(v.odometer)} <span>km</span></div>
                </div>
                <div>
                  <div className="vehicle-header__stat-label">Next PM</div>
                  <div className="vehicle-header__stat-value">{formatNumber(v.next_pm)} <span>km</span></div>
                </div>
                <div>
                  <div className="vehicle-header__stat-label">Efficiency</div>
                  <div className="vehicle-header__stat-value">{v.fuel_capacity ? (v.fuel_capacity * 0.2).toFixed(1) : '28.4'} <span>MPG</span></div>
                </div>
              </div>
            </div>
            <div className="score-card" style={{ minWidth: 200 }}>
              <div className="score-card__label">Vehicle Health Score</div>
              <div className="score-card__value">{healthScore}<span>/100</span></div>
              <div className="score-card__desc">
                {healthScore >= 90 ? 'Optimal condition.' : 'Below optimal range. Brake pad wear and oil viscosity reaching critical thresholds.'}
              </div>
              <div className="score-card__bar">
                <div className="score-card__bar-fill" style={{ width: `${healthScore}%` }} />
              </div>
            </div>
          </div>

          {/* Condition Map + Fluid Levels */}
          <div className="grid-8-4" style={{ marginBottom: 28 }}>
            <div className="card">
              <div className="card__header">
                <span className="card__header-title">Technical Condition Map</span>
                <div className="tabs-bar">
                  <button className="tabs-bar__tab tabs-bar__tab--active">TOP VIEW</button>
                  <button className="tabs-bar__tab">CHASSIS</button>
                </div>
              </div>
              <div className="card__body">
                <div className="condition-map">
                  <div className="condition-map__placeholder">Vehicle condition diagram</div>
                  <div className="condition-dot condition-dot--inspection" style={{ top: '45%', left: '48%' }} />
                  <div className="condition-dot condition-dot--damage" style={{ bottom: '20%', left: '35%' }} />
                  <div className="condition-dot condition-dot--damage" style={{ bottom: '20%', right: '30%' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="card__header">
                  <span className="card__header-title">Fluid Levels & Criticals</span>
                </div>
                <div className="card__body">
                  <FluidRow name="Engine Oil Viscosity" value={30} status="LOW" />
                  <FluidRow name="Brake Fluid" value={88} status="NORMAL" />
                  <FluidRow name="Coolant Level" value={92} status="NORMAL" />
                  <div className="grid-2" style={{ marginTop: 16 }}>
                    <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>ELECTRICAL</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>14.2V Stable</div>
                    </div>
                    <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', padding: 14, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)', marginBottom: 4 }}>TIRE WEAR</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>4.5mm Avg</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Log */}
          <div className="card">
            <div className="card__header">
              <span className="card__header-title">Maintenance Log & Technical History</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--ghost">Filter Logs</button>
                <button className="btn btn--ghost">Export PDF</button>
              </div>
            </div>
            <div className="card__body--full">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Service Type</th>
                    <th>Technician ID</th>
                    <th>Odometer</th>
                    <th>Outcome</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.filter(e => ['maintenance', 'condition_check'].includes(e.event_type)).slice(0, 5).map((evt) => (
                    <tr key={evt.event_id}>
                      <td>{new Date(evt.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: evt.event_type === 'maintenance' ? 'var(--error)' : 'var(--primary)' }} />
                          {evt.event_type === 'maintenance' ? 'Maintenance' : 'Condition Check'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{evt.employee_id}</td>
                      <td>{evt.odometer ? `${evt.odometer.toLocaleString()} mi` : '-'}</td>
                      <td><span className="badge badge--completed">COMPLETED</span></td>
                      <td><button className="btn btn--ghost"><Eye size={16} /></button></td>
                    </tr>
                  ))}
                  {events.filter(e => ['maintenance', 'condition_check'].includes(e.event_type)).length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>No maintenance records</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAB Buttons */}
          <div style={{ position: 'fixed', bottom: 80, right: 32, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 90 }}>
            <button className="btn btn--secondary" style={{ borderRadius: '50%', width: 48, height: 48, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Printer size={20} />
            </button>
            <button className="btn btn--primary" style={{ borderRadius: '50%', width: 48, height: 48, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => navigate(`/fleet/${v.vin}`)}>
              <Plus size={20} />
            </button>
          </div>
        </>
      )}
    </Layout>
  );
}

function FluidRow({ name, value, status }) {
  const isLow = status === 'LOW';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--on-surface-variant)' }}>{name}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isLow ? 'var(--error)' : 'var(--success)' }}>
          {status} ({value}%)
        </span>
      </div>
      <div className="progress-bar">
        <div className={`progress-bar__fill ${isLow ? 'progress-bar__fill--error' : 'progress-bar__fill--primary'}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
