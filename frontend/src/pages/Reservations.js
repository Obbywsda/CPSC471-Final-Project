import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { reservationApi, vehicleApi, customerApi, locationApi } from '../api';
import { formatCurrency, formatDateTime, formatReservationPeriod } from '../utils/formatters';
import {
  Plus, Filter, Download, RefreshCw,
  Car, CalendarDays, CornerDownLeft, DollarSign,
  AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

export default function Reservations() {
  const { isMechanic, canEdit } = useAuth();
  return isMechanic ? <MechanicReservations /> : <ManagerReservations canEdit={canEdit} />;
}

/* ============================================= */
/* MANAGER / EMPLOYEE RESERVATIONS               */
/* ============================================= */
function ManagerReservations({ canEdit }) {
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('All Reservations');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const [reservationResponse, statsResponse] = await Promise.all([
        reservationApi.getAll(),
        reservationApi.getStats(),
      ]);
      setReservations(reservationResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const tabs = ['All Reservations', 'Active Only', 'Pending Review'];
  const filteredReservations = reservations.filter((reservation) => {
    if (activeTab === 'Active Only') return reservation.rental_status === 'ACTIVE';
    if (activeTab === 'Pending Review') return ['CONFIRMED', 'IN TRANSIT'].includes(reservation.rental_status);
    return true;
  });
  const displayed = filteredReservations;
  const totalRevenue = reservations.reduce((sum, reservation) => sum + Number(reservation.total_cost || 0), 0);

  return (
    <Layout title="Reservations Manager">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <div className="page-header__breadcrumb">Overview</div>
            <h1 className="page-header__title">Fleet Availability</h1>
          </div>
          {canEdit && (
            <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add New Reservation
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-cards">
        <StatCard label="Active Rentals" value={Number(stats?.active ?? 0)} icon={Car} />
        <StatCard label="Upcoming Pickups" value={Number(stats?.upcoming ?? 0)} icon={CalendarDays} />
        <StatCard label="Returns Today" value={Number(stats?.returns_today ?? 0)} icon={CornerDownLeft} />
        <div className="stat-card stat-card--accent">
          <div className="stat-card__top">
            <div className="stat-card__label">Recorded Revenue</div>
            <div className="stat-card__icon"><DollarSign size={18} /></div>
          </div>
          <div className="stat-card__value">{formatCurrency(totalRevenue)}</div>
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card__header">
          <div className="tabs-bar">
            {tabs.map(tab => (
              <button
                key={tab}
                className={`tabs-bar__tab ${activeTab === tab ? 'tabs-bar__tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >{tab}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--ghost"><Filter size={14} /> Filters</button>
            <button className="btn btn--ghost"><Download size={14} /> Export CSV</button>
          </div>
        </div>
        <div className="card__body--full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Information</th>
                <th>Unit #</th>
                <th>Rental Period</th>
                <th>Status</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((res, i) => (
                <tr key={res.event_id || i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'var(--primary-container)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)',
                      }}>
                        {(res.customer_name || res.name || 'AS').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{res.customer_name || res.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>ID: #{res.agreement_number || res.res_id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>{res.unit_number || res.unit}</span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{[res.year, res.make, res.model].filter(Boolean).join(' ')} {res.vehicle_class ? `• ${res.vehicle_class}` : ''}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{formatReservationPeriod(res)}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>
                      {`${res.start_location_name || res.start_location || 'Unknown'} to ${res.return_location_name || res.return_location || 'Unknown'}`}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      (res.rental_status || res.status) === 'ACTIVE' ? 'badge--active'
                      : (res.rental_status || res.status) === 'CONFIRMED' ? 'badge--confirmed'
                      : 'badge--in-transit'
                    }`}>
                      <span className="badge__dot" />
                      {res.rental_status || res.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(res.total_cost)}</td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>
                    No reservations match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>Showing {displayed.length} reservations</span>
          <div className="pagination__pages">
            <button className="pagination__btn pagination__btn--active">1</button>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-8-4">
        {/* Fleet Tracker Map */}
        <div className="card">
          <div className="card__header">
            <span className="card__header-title">Live Fleet Tracker</span>
            <span style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
              {Number(stats?.active ?? 0)} ACTIVE NOW
            </span>
          </div>
          <div className="card__body">
            <div className="map-placeholder">
              <div className="map-dot" style={{ top: '35%', left: '30%' }} />
              <div className="map-dot" style={{ top: '50%', left: '55%' }} />
              <div className="map-dot" style={{ bottom: '30%', left: '45%' }} />
              <div className="map-dot" style={{ bottom: '25%', left: '35%' }} />
              <div style={{
                position: 'absolute', bottom: 16, left: 16, right: 16,
                background: 'var(--surface)', borderRadius: 'var(--radius-md)',
                padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase' }}>Current Dense Zone</div>
                  <div style={{ fontWeight: 700 }}>Downtown Sector 4</div>
                </div>
                <button className="btn btn--primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>FULL MAP</button>
              </div>
            </div>
          </div>
        </div>

        {/* Reservation Insights */}
        <div className="card">
          <div className="card__header">
            <span className="card__header-title">Reservation Insights</span>
          </div>
          <div className="card__body">
            <div className="insight-item">
              <div className="insight-item__indicator insight-item__indicator--info" />
              <div>
                <div className="insight-item__title">Reservation #RES-94021 Edited</div>
                <div className="insight-item__desc">Manager 'admin_sarah' adjusted the return date from Oct 16 to Oct 18 per customer request.</div>
                <div className="insight-item__time">14 minutes ago</div>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-item__indicator insight-item__indicator--error" />
              <div>
                <div className="insight-item__title">Alert: Unit-112 Late Return</div>
                <div className="insight-item__desc">Marcus Park has not checked in Unit-112. Contact initiated via mobile terminal.</div>
                <div className="insight-item__time">2 hours ago</div>
              </div>
            </div>
            <div className="insight-item">
              <div className="insight-item__indicator insight-item__indicator--success" />
              <div>
                <div className="insight-item__title">New Reservation Confirmed</div>
                <div className="insight-item__desc">David Chen reserved UNIT-405 for a 14-day corporate lease starting Nov 1.</div>
                <div className="insight-item__time">5 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showAddModal && (
        <AddReservationModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            loadReservations();
          }}
        />
      )}
    </Layout>
  );
}

/* ============================================= */
/* MECHANIC RESERVATIONS                         */
/* ============================================= */
function MechanicReservations() {
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('Active Reservations');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reservationApi.getAll()
      .then(r => setReservations(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayed = reservations.filter((reservation) => {
    if (activeTab === 'Active Reservations') {
      return reservation.rental_status === 'ACTIVE';
    }

    if (!reservation.start_time || reservation.rental_status !== 'CONFIRMED') {
      return false;
    }

    const start = new Date(reservation.start_time).getTime();
    const now = Date.now();
    const seventyTwoHours = 72 * 60 * 60 * 1000;
    return start >= now && start <= now + seventyTwoHours;
  });

  return (
    <Layout title="Digital Concourse Fleet">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <div className="page-header__breadcrumb">OPERATIONAL READINESS</div>
            <h1 className="page-header__title">Reservations & Deployment</h1>
            <p className="page-header__subtitle">
              Mechanic View: Monitor vehicle availability and movement timelines to ensure fleet readiness. Sensitive customer data is restricted.
            </p>
          </div>
          <div className="page-header__actions">
            <button className="btn btn--secondary"><Filter size={16} /> Filter Units</button>
            <button className="btn btn--primary"><RefreshCw size={16} /> Refresh Logs</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-cards">
        <div className="stat-card stat-card--accent" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2559bd)' }}>
          <div className="stat-card__label">OUTBOUND TODAY</div>
          <div className="stat-card__value">{displayed.length}</div>
          <div className="stat-card__sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} /> {displayed.filter((reservation) => reservation.vehicle_status !== 'Available').length} units need attention
          </div>
        </div>
        <StatCard label="Returns Expected" value={reservations.filter((reservation) => reservation.rental_status === 'COMPLETED').length} icon={CornerDownLeft} />
        <StatCard label="Ready for Deployment" value={reservations.filter((reservation) => reservation.vehicle_status === 'Available').length} icon={CheckCircle} />
        <StatCard label="Units Maintenance Hold" value={reservations.filter((reservation) => reservation.vehicle_status !== 'Available').length} icon={AlertTriangle} />
      </div>

      {/* Fleet Movement Log */}
      <div className="card">
        <div className="card__header">
          <span className="card__header-title">Fleet Movement Log</span>
          <div className="tabs-bar">
            {['Active Reservations', 'Upcoming (72h)'].map(tab => (
              <button
                key={tab}
                className={`tabs-bar__tab ${activeTab === tab ? 'tabs-bar__tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >{tab}</button>
            ))}
          </div>
        </div>
        <div className="card__body--full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle Identification</th>
                <th>Unit Class</th>
                <th>Departure Schedule</th>
                <th>Expected Return</th>
                <th>Status / Notes</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((mov, i) => (
                <tr key={mov.event_id || i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 48, height: 36, borderRadius: 'var(--radius-sm)',
                        background: 'var(--surface-container-low)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.5,
                      }}>&#128663;</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{mov.unit_number || 'N/A'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>VIN: {mov.vin ? mov.vin.substring(0, 12) + '...' : 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      background: 'var(--primary-container)', color: 'var(--primary)',
                      padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>{mov.vehicle_class || mov.car_class || 'Unknown Class'}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{formatDateTime(mov.start_time, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{mov.start_location_name || mov.start_location || 'Unassigned location'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{formatDateTime(mov.end_time, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{mov.return_location_name || mov.return_location || 'Unassigned location'}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      mov.vehicle_status === 'Available' ? 'badge--ready'
                      : mov.vehicle_status === 'In Maintenance' ? 'badge--qc-hold'
                      : 'badge--scheduled'
                    }`}>{mov.vehicle_status || 'Unavailable'}</span>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>
                    No reservation movement records found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>Showing {displayed.length} fleet movement records</span>
          <div className="pagination__pages">
            <button className="pagination__btn pagination__btn--active">1</button>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />
      <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
        Support Live
      </div>
    </Layout>
  );
}

/* ============================================= */
/* HELPERS                                       */
/* ============================================= */
function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__icon"><Icon size={18} /></div>
      </div>
      <div className="stat-card__value">{value}</div>
    </div>
  );
}

function AddReservationModal({ onClose, onSaved }) {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vin: '',
    agreement_number: '',
    customer_id: '',
    start_location: '',
    return_location: '',
    start_time: '',
    end_time: '',
    odometer_out: '',
  });

  useEffect(() => {
    Promise.all([vehicleApi.getAll(), customerApi.getAll(), locationApi.getAll()])
      .then(([vehicleResponse, customerResponse, locationResponse]) => {
        setVehicles(vehicleResponse.data);
        setCustomers(customerResponse.data);
        setLocations(locationResponse.data);
      })
      .catch(console.error);
  }, []);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.vin || !form.agreement_number || !form.customer_id || !form.start_location || !form.return_location || !form.start_time) {
      alert('Please fill in all required reservation fields.');
      return;
    }

    setSaving(true);
    try {
      await reservationApi.create({
        ...form,
        employee_id: 'E22DD7',
      });
      onSaved();
    } catch (error) {
      alert(`Error creating reservation: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <span>Add Reservation</span>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>&times;</button>
        </div>
        <div className="modal__body">
          <div className="form-row">
            <div className="form-group">
              <label>Vehicle</label>
              <select value={form.vin} onChange={(e) => handleChange('vin', e.target.value)}>
                <option value="">Select vehicle...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.vin} value={vehicle.vin}>
                    {vehicle.unit_number} - {vehicle.year} {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Agreement Number</label>
              <input value={form.agreement_number} onChange={(e) => handleChange('agreement_number', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Customer</label>
              <select value={form.customer_id} onChange={(e) => handleChange('customer_id', e.target.value)}>
                <option value="">Select customer...</option>
                {customers.map((customer) => (
                  <option key={customer.customer_id} value={customer.customer_id}>
                    {customer.first_name} {customer.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Odometer Out</label>
              <input type="number" value={form.odometer_out} onChange={(e) => handleChange('odometer_out', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Location</label>
              <select value={form.start_location} onChange={(e) => handleChange('start_location', e.target.value)}>
                <option value="">Select location...</option>
                {locations.map((location) => (
                  <option key={location.location_code} value={location.location_code}>
                    {location.location_code} - {location.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Return Location</label>
              <select value={form.return_location} onChange={(e) => handleChange('return_location', e.target.value)}>
                <option value="">Select location...</option>
                {locations.map((location) => (
                  <option key={location.location_code} value={location.location_code}>
                    {location.location_code} - {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Time</label>
              <input type="datetime-local" value={form.start_time} onChange={(e) => handleChange('start_time', e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="datetime-local" value={form.end_time} onChange={(e) => handleChange('end_time', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Create Reservation'}
          </button>
        </div>
      </div>
    </div>
  );
}

