import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { vehicleApi, eventApi, locationApi, conditionApi } from '../api';
import { formatDate, formatDateTime, formatNumber, getEventLabel, getVehicleStatusClass } from '../utils/formatters';
import {
  Download, Save, ChevronRight, Camera, MapPin,
  AlertTriangle, Eye, Plus, Filter,
} from 'lucide-react';

export default function FleetInventory() {
  const { isMechanic, canEdit } = useAuth();
  const { vin } = useParams();

  if (vin) {
    return isMechanic ? <MechanicVehicleDetail vin={vin} /> : <ManagerVehicleDetail vin={vin} canEdit={canEdit} />;
  }
  return <FleetList canEdit={canEdit} isMechanic={isMechanic} />;
}

/* ============================================= */
/* FLEET LIST (shared)                           */
/* ============================================= */
function FleetList({ canEdit, isMechanic }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadFleet = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleResponse, locationResponse] = await Promise.all([
        vehicleApi.getAll(),
        locationApi.getAll(),
      ]);
      setVehicles(vehicleResponse.data);
      setLocations(locationResponse.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  if (loading) return <Layout title="Concourse Fleet"><div className="loading-state">Loading fleet...</div></Layout>;

  return (
    <Layout title="Concourse Fleet" badge={isMechanic ? 'MECH_VIEW' : undefined}>
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <div className="page-header__breadcrumb">Fleet Management</div>
            <h1 className="page-header__title">Fleet Inventory</h1>
            <p className="page-header__subtitle">Manage and view all fleet vehicles</p>
          </div>
          <div className="page-header__actions">
            <button className="btn btn--ghost"><Filter size={16} /> Filter</button>
            {canEdit && (
              <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Add Vehicle
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__body--full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit #</th>
                <th>Vehicle</th>
                <th>VIN</th>
                <th>Status</th>
                <th>Location</th>
                <th>Odometer</th>
                <th>Next PM</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.vin} style={{ cursor: 'pointer' }} onClick={() => navigate(`/fleet/${v.vin}`)}>
                  <td style={{ fontWeight: 700 }}>{v.unit_number}</td>
                  <td>{v.year} {v.make} {v.model}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>{v.vin.substring(0, 10)}...</td>
                  <td>
                    <span className={`badge ${getVehicleStatusClass(v.status)}`}>{v.status}</span>
                  </td>
                  <td>{v.location_name ? `${v.location_name} (${v.location_code})` : v.location_code}</td>
                  <td>{formatNumber(v.odometer)}</td>
                  <td>{formatNumber(v.next_pm)}</td>
                  <td><button className="btn btn--ghost"><Eye size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>Showing {vehicles.length} vehicles</span>
          <div className="pagination__pages">
            <button className="pagination__btn pagination__btn--active">1</button>
          </div>
        </div>
      </div>
      {showAddModal && (
        <AddVehicleModal
          locations={locations}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            loadFleet();
          }}
        />
      )}
    </Layout>
  );
}

/* ============================================= */
/* MANAGER / EMPLOYEE VEHICLE DETAIL             */
/* ============================================= */
function ManagerVehicleDetail({ vin, canEdit }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeHolds, setActiveHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [selectedHold, setSelectedHold] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: v } = await vehicleApi.getByVin(vin);
      setVehicle(v);
      setForm({
        vin_display: v.vin,
        unit_number: v.unit_number,
        odometer: v.odometer,
        location_code: v.location_code,
      });
      try {
        const regRes = await vehicleApi.getRegistration(v.vin);
        if (regRes.data.length > 0) {
          setRegistration(regRes.data[0]);
          setForm(prev => ({ ...prev, plate: regRes.data[0].plate }));
        }
      } catch {}
      try {
        const evtRes = await eventApi.getByVehicle(v.vin);
        setEvents(evtRes.data);
      } catch {}
      try {
        const holdRes = await vehicleApi.getHolds(v.vin);
        setActiveHolds(holdRes.data);
      } catch { setActiveHolds([]); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [vin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await vehicleApi.update(vehicle.vin, {
        unit_number: form.unit_number,
        odometer: parseInt(form.odometer) || vehicle.odometer,
        location_code: form.location_code,
      });
      await loadData();
    } catch (err) { alert('Error saving: ' + err.message); }
    finally { setSaving(false); }
  };

  const changeHold = async ({ action, reason }) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await eventApi.create({
        event_type: 'hold',
        vin: vehicle.vin,
        employee_id: user?.id || null,
        location_code: form.location_code || vehicle.location_code,
        odometer: form.odometer || vehicle.odometer,
        reason,
        action,
      });
      setShowHoldModal(false);
      await loadData();
    } catch (error) {
      alert(`Error updating hold: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeHold = async (hold) => {
    await changeHold({ action: 'Remove', reason: hold.reason || hold.hold_reason || 'Hold cleared' });
  };

  if (loading) return <Layout title="Concourse Fleet"><div className="loading-state">Loading vehicle...</div></Layout>;
  if (!vehicle) return <Layout title="Concourse Fleet"><div className="loading-state">Vehicle not found</div></Layout>;

  const v = vehicle;
  const latestEvent = events[0];
  const registrationExpiry = registration?.expiration_date || v.registration_expiration_date;
  const activeHoldCount = activeHolds.length;
  const isHoldActive = (event) => {
    if (event.hold_action === 'Remove') return false;
    const eventReason = event.reason || event.hold_reason || '';
    const isInActiveHoldList = activeHolds.some((hold) => (
      hold.event_id === event.event_id
      || (eventReason && hold.reason === eventReason)
    ));

    if (isInActiveHoldList) return true;
    if (!eventReason) return false;

    const matchingHoldEvents = events.filter((historyEvent) => (
      historyEvent.event_type === 'hold'
      && (historyEvent.reason || historyEvent.hold_reason || '') === eventReason
    ));
    const adds = matchingHoldEvents.filter((historyEvent) => historyEvent.hold_action !== 'Remove').length;
    const removes = matchingHoldEvents.filter((historyEvent) => historyEvent.hold_action === 'Remove').length;

    return adds > removes;
  };

  return (
    <Layout title="Concourse Fleet">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span className={`badge ${getVehicleStatusClass(v.status)}`}>{v.status}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>ID: {v.unit_number}</span>
            {activeHoldCount > 0 && <span className="badge badge--hold">{activeHoldCount} HOLD{activeHoldCount === 1 ? '' : 'S'}</span>}
          </div>
          <h1 className="vehicle-header__title">{v.year} {v.make} {v.model}</h1>
          <p className="vehicle-header__subtitle">{v.trim} &bull; {v.body_style} &bull; {v.fuel_type}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary" onClick={() => navigate('/fleet')}>
            <Download size={16} /> Export Log
          </button>
          {canEdit && (
            <button className="btn btn--secondary" onClick={() => setShowHoldModal(true)} disabled={saving}>
              Add Hold
            </button>
          )}
          {canEdit && (
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      <div className="grid-8-4">
        {/* Left Column */}
        <div>
          {/* Vehicle Information Form */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card__header">
              <span className="card__header-title">Vehicle Information</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>DATABASE SYNC: ACTIVE</span>
            </div>
            <div className="card__body">
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>VIN Number</label>
                  <input value={form.vin_display || ''} readOnly style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group">
                  <label>Unit Number</label>
                  <input value={form.unit_number || ''} onChange={(e) => setForm(p => ({ ...p, unit_number: e.target.value }))} readOnly={!canEdit} />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label>License Plate</label>
                  <input value={form.plate || ''} readOnly style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group">
                  <label>Current Odometer</label>
                  <input type="number" value={form.odometer || ''} onChange={(e) => setForm(p => ({ ...p, odometer: e.target.value }))} readOnly={!canEdit} />
                </div>
              </div>
              <div className="form-group">
                <label>Current Location</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={form.location_code || ''} onChange={(e) => setForm(p => ({ ...p, location_code: e.target.value }))} readOnly={!canEdit} style={{ flex: 1 }} />
                  <button className="btn btn--ghost" style={{ flexShrink: 0 }}><MapPin size={16} /></button>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle History */}
          <div className="card">
            <div className="card__header">
              <span className="card__header-title">Vehicle History</span>
              <button style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>View All Records</button>
            </div>
            <div className="card__body">
              {events.slice(0, 8).map((evt) => (
                <div
                  key={evt.event_id}
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '14px 0',
                    alignItems: 'flex-start',
                    cursor: evt.event_type === 'hold' ? 'pointer' : 'default',
                    borderRadius: 'var(--radius-md)',
                  }}
                  onClick={() => evt.event_type === 'hold' && setSelectedHold(evt)}
                  title={evt.event_type === 'hold' ? 'Open hold details' : undefined}
                >
                  <div style={{
                    background: 'var(--primary-container)', borderLeft: '3px solid var(--primary)',
                    padding: '6px 10px', borderRadius: 'var(--radius-sm)', textAlign: 'center', minWidth: 50,
                  }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {new Date(evt.timestamp).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {new Date(evt.timestamp).getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {getEventLabel(evt)}
                      </span>
                      <span className={`badge ${evt.event_type === 'maintenance' ? 'badge--completed' : evt.event_type === 'hold' ? 'badge--hold' : 'badge--verified'}`}>
                        {evt.event_type === 'maintenance' ? 'COMPLETED' : evt.event_type === 'hold' ? (isHoldActive(evt) ? 'ACTIVE HOLD' : evt.hold_action === 'Remove' ? 'REMOVED' : 'HOLD') : 'VERIFIED'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: 4 }}>
                      {evt.event_type === 'hold' && `${evt.hold_reason || 'Vehicle hold'} | `}
                      Location: {evt.location_name || evt.location_code}{evt.odometer ? ` | Odometer: ${formatNumber(evt.odometer)} km` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Vehicle Photo */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{
              height: 180, background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <span style={{ fontSize: '4rem', opacity: 0.3 }}>&#128663;</span>
              <button className="btn btn--ghost" style={{
                position: 'absolute', bottom: 12, right: 12,
                background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 'var(--radius-full)',
              }}>
                <Camera size={14} /> Edit Photos
              </button>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card__header">
              <span className="card__header-title">Technical Specs</span>
            </div>
            <div className="card__body">
              <div className="specs-list">
                <SpecItem label="Car Class" value={v.car_class || 'N/A'} />
                <SpecItem label="Fuel Type" value={v.fuel_type || 'N/A'} />
                <SpecItem label="Engine Size" value={v.engine_size ? `${v.engine_size}L` : 'N/A'} />
                <SpecItem label="Horsepower" value={v.horsepower ? `${v.horsepower} hp` : 'N/A'} />
                <SpecItem label="Vehicle Age" value={v.vehicle_age ? `${v.vehicle_age} years` : 'N/A'} />
                <SpecItem label="Registration Expires" value={formatDate(registrationExpiry)} />
                <div className="grid-2" style={{ gap: 8 }}>
                  <div className="specs-item">
                    <div>
                      <div className="specs-item__label">Drivetrain</div>
                      <div className="specs-item__value">{v.fuel_type === 'Electric' ? 'AWD' : 'RWD'}</div>
                    </div>
                  </div>
                  <div className="specs-item">
                    <div>
                      <div className="specs-item__label">Transmission</div>
                      <div className="specs-item__value">Auto</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Alert */}
          {v.status !== 'Available' && (
            <div style={{
              background: 'var(--warning-container)', borderRadius: 'var(--radius-lg)',
              padding: 20, display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={20} style={{ color: '#b45309', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#b45309', marginBottom: 4 }}>Pending Alert</div>
                <div style={{ fontSize: '0.78rem', color: '#92400e' }}>
                  {latestEvent ? `${getEventLabel(latestEvent)} recorded on ${formatDate(latestEvent.timestamp, { month: 'short', day: 'numeric', year: 'numeric' })}.` : 'Vehicle status requires attention.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showHoldModal && (
        <HoldModal
          title="Add Vehicle Hold"
          confirmLabel="Add Hold"
          defaultReason="Manager hold"
          onClose={() => setShowHoldModal(false)}
          onSubmit={(reason) => changeHold({ action: 'Add', reason })}
        />
      )}

      {selectedHold && (
        <HoldDetailModal
          hold={selectedHold}
          active={
            isHoldActive(selectedHold)
            || (
              canEdit
              && selectedHold.hold_action !== 'Remove'
              && v.status === 'On Hold'
              && activeHoldCount > 0
            )
          }
          canRemove={canEdit}
          saving={saving}
          onBack={() => setSelectedHold(null)}
          onRemove={async () => {
            await removeHold(selectedHold);
            setSelectedHold(null);
          }}
        />
      )}

      {/* Bottom Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 'var(--sidebar-width)', right: 0,
        background: 'var(--surface)', padding: '12px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            Vehicle Online
          </span>
          <button className="btn btn--ghost"><MapPin size={14} /></button>
        </div>
        <button className="btn btn--primary" onClick={() => navigate('/fleet')}>QUICK ACTION</button>
      </div>
    </Layout>
  );
}

function SpecItem({ label, value }) {
  return (
    <div className="specs-item">
      <div>
        <div className="specs-item__label">{label}</div>
        <div className="specs-item__value">{value}</div>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--on-surface-variant)' }} />
    </div>
  );
}

/* ============================================= */
/* MECHANIC VEHICLE DETAIL                       */
/* ============================================= */
function MechanicVehicleDetail({ vin }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [events, setEvents] = useState([]);
  const [damages, setDamages] = useState([]);
  const [activeHolds, setActiveHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: v } = await vehicleApi.getByVin(vin);
      setVehicle(v);
      try {
        const regRes = await vehicleApi.getRegistration(v.vin);
        if (regRes.data.length > 0) setRegistration(regRes.data[0]);
      } catch {}
      try {
        const evtRes = await eventApi.getByVehicle(v.vin);
        setEvents(evtRes.data);
      } catch {}
      try {
        const damageRes = await conditionApi.getDamages(v.vin);
        setDamages(damageRes.data);
      } catch {}
      try {
        const holdRes = await vehicleApi.getHolds(v.vin);
        setActiveHolds(holdRes.data);
      } catch { setActiveHolds([]); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [vin]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <Layout title="Concourse Fleet" badge="MECH_VIEW"><div className="loading-state">Loading...</div></Layout>;
  if (!vehicle) return <Layout title="Concourse Fleet" badge="MECH_VIEW"><div className="loading-state">Vehicle not found</div></Layout>;

  const v = vehicle;
  const needsService = v.status === 'In Maintenance' || v.status === 'On Hold';
  const fuelPct = v.fuel_capacity ? Math.min(100, Math.round((v.fuel_capacity * 0.65))) : 65;
  const oilPct = v.next_pm && v.odometer ? Math.max(5, Math.round(((v.next_pm - v.odometer) / v.next_pm) * 100)) : 15;
  const latestConditionCheck = events.find((event) => event.event_type === 'condition_check');
  const latestDamage = damages[0];
  const activeHoldCount = activeHolds.length;

  const addMaintenanceHold = async (reason) => {
    setSaving(true);
    try {
      await eventApi.create({
        event_type: 'hold',
        vin: v.vin,
        employee_id: user?.id || null,
        location_code: v.location_code,
        odometer: v.odometer,
        reason,
        action: 'Add',
      });
      setShowHoldModal(false);
      await loadData();
    } catch (error) {
      alert(`Error adding hold: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeMaintenanceHold = async (hold) => {
    setSaving(true);
    try {
      await eventApi.create({
        event_type: 'hold',
        vin: v.vin,
        employee_id: user?.id || null,
        location_code: v.location_code,
        odometer: v.odometer,
        reason: hold?.reason || 'Maintenance hold cleared',
        action: 'Remove',
      });
      await loadData();
    } catch (error) {
      alert(`Error removing hold: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const completeMaintenance = async (updates) => {
    setSaving(true);
    try {
      await eventApi.create({
        event_type: 'maintenance',
        vin: v.vin,
        employee_id: user?.id || null,
        location_code: updates.location_code || v.location_code,
        odometer: updates.odometer || v.odometer,
        reason: updates.reason || 'Maintenance completed',
        action: 'Remove',
        subtype: 'Service Complete',
      });

      if (activeHolds.length > 0) {
        for (const hold of activeHolds) {
          await eventApi.create({
            event_type: 'hold',
            vin: v.vin,
            employee_id: user?.id || null,
            location_code: updates.location_code || v.location_code,
            odometer: updates.odometer || v.odometer,
            reason: hold.reason || 'Maintenance hold cleared',
            action: 'Remove',
          });
        }
      }

      await vehicleApi.update(v.vin, {
        odometer: updates.odometer || v.odometer,
        next_pm: updates.next_pm || v.next_pm,
        location_code: updates.location_code || v.location_code,
      });

      setShowCompleteModal(false);
      await loadData();
    } catch (error) {
      alert(`Error completing maintenance: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Concourse Fleet" badge="MECH_VIEW">
      {/* Breadcrumb + Header */}
      <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginBottom: 8 }}>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/fleet')}>Fleet Inventory</span>
        <span> / {v.make} {v.model}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
            Vehicle ID: #{v.unit_number}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
            VIN: {v.vin} &bull; Plate: {registration?.plate || 'N/A'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {needsService && <span className="badge badge--service-required">SERVICE REQUIRED</span>}
          <button className="btn btn--secondary"><Download size={16} /> Export Full Tech Log</button>
          <button className="btn btn--secondary" onClick={() => setShowHoldModal(true)} disabled={saving}>
            Add Maintenance Hold
          </button>
          <button className="btn btn--primary" onClick={() => setShowCompleteModal(true)} disabled={saving}>
            Complete Maintenance
          </button>
        </div>
      </div>

      {/* Top Info Row */}
      <div className="grid-8-4" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{
            width: 200, height: 140, background: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '4rem', opacity: 0.3 }}>&#128663;</span>
          </div>
          <div>
            <div style={{ display: 'flex', gap: 32, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Odometer</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>{formatNumber(v.odometer)} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--on-surface-variant)' }}>KM</span></div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last PM Date</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
                  {v.in_service_date ? new Date(v.in_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                </div>
              </div>
            </div>
            {/* Fuel + Oil bars */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>FUEL LEVEL</span>
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className="progress-bar__fill progress-bar__fill--primary" style={{ width: `${fuelPct}%` }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{fuelPct}%</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--on-surface-variant)' }}>OIL LIFE</span>
                </div>
                <div className="progress-bar" style={{ height: 8 }}>
                  <div className={`progress-bar__fill ${oilPct < 20 ? 'progress-bar__fill--error' : 'progress-bar__fill--success'}`} style={{ width: `${oilPct}%` }} />
                </div>
                <span style={{ fontSize: '0.72rem', color: oilPct < 20 ? 'var(--error)' : 'var(--on-surface-variant)' }}>{oilPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tire Pressure */}
        <div className="card">
          <div className="card__header">
            <span className="card__header-title">Live Tire Pressure (PSI)</span>
          </div>
          <div className="card__body">
            <div className="tire-grid">
              <TireCell label="Front Left" value="34.2" />
              <TireCell label="Front Right" value="34.5" />
              <TireCell label="Rear Left" value="28.9" low />
              <TireCell label="Rear Right" value="33.8" />
            </div>
          </div>
        </div>
      </div>

      {/* Condition Map + Fluid Levels + Engine Specs */}
      <div className="grid-8-4" style={{ marginBottom: 24 }}>
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card__header">
              <span className="card__header-title">Vehicle Condition Map</span>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--error)', display: 'inline-block' }} /> Damage
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} /> Pending Inspection
                </span>
              </div>
            </div>
            <div className="card__body">
              <div className="condition-map" style={{ height: 300 }}>
                <div className="condition-map__placeholder">Vehicle condition diagram</div>
                {latestDamage && <div className="condition-dot condition-dot--damage" style={{ top: '35%', left: '25%' }}>1</div>}
                {latestConditionCheck && <div className="condition-dot condition-dot--inspection" style={{ bottom: '20%', right: '30%' }}>{damages.length}</div>}
              </div>
              <div className="grid-2" style={{ marginTop: 16 }}>
                <div style={{ background: 'var(--error-container)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--error)' }}>
                    {latestDamage ? `1 - ${latestDamage.body_area}` : 'No damage reports'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                    {latestDamage ? `${latestDamage.damage_type}${latestDamage.severity ? ` • ${latestDamage.severity}` : ''}` : 'No condition damage records have been logged for this vehicle.'}
                  </div>
                </div>
                <div style={{ background: 'var(--primary-container)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                    {latestConditionCheck ? `${damages.length} issue(s) in latest inspection` : 'Inspection pending'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                    {latestConditionCheck?.cc_notes || 'No inspection notes available.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Maintenance Logs */}
          {activeHoldCount > 0 && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card__header">
                <span className="card__header-title">Active Maintenance Holds</span>
              </div>
              <div className="card__body">
                <ActiveHoldList holds={activeHolds} saving={saving} onRemove={removeMaintenanceHold} />
              </div>
            </div>
          )}

          {/* Technical Maintenance Logs */}
          <div className="card">
            <div className="card__header">
              <span className="card__header-title">Technical Maintenance Logs</span>
              <button style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>View History</button>
            </div>
            <div className="card__body">
              {events.filter(e => ['maintenance', 'condition_check'].includes(e.event_type)).slice(0, 3).map((evt) => (
                <div key={evt.event_id} style={{ display: 'flex', gap: 14, padding: '14px 0', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: evt.event_type === 'maintenance' ? 'var(--primary-container)' : 'var(--surface-container-high)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <WrenchIcon size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {evt.event_type === 'maintenance' ? 'Maintenance Service' : 'Condition Inspection'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                      {evt.location_name || evt.location_code}{evt.odometer ? ` | ${formatNumber(evt.odometer)} km` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
                    {new Date(evt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Fluid Levels */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card__header">
              <span className="card__header-title" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Current Fluid Levels</span>
            </div>
            <div className="card__body">
              <FluidLevel name="Coolant" value={88} color="var(--primary)" />
              <FluidLevel name="AdBlue (DEF)" value={42} color="var(--primary)" />
              <FluidLevel name="Brake Fluid" value={94} color="var(--primary)" />
            </div>
          </div>

          {/* Engine Specs */}
          <div className="card">
            <div className="card__header">
              <span className="card__header-title" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Engine Specifications</span>
            </div>
            <div className="card__body">
              <div className="info-row"><span className="info-row__label">Engine Type</span><span className="info-row__value">{v.engine_size ? `${v.engine_size}L` : 'N/A'}</span></div>
              <div className="info-row"><span className="info-row__label">Horsepower</span><span className="info-row__value">{v.horsepower ? `${v.horsepower} hp` : 'N/A'}</span></div>
              <div className="info-row"><span className="info-row__label">Transmission</span><span className="info-row__value">Auto</span></div>
              <div className="info-row"><span className="info-row__label">Drive Type</span><span className="info-row__value">{v.fuel_type === 'Electric' ? 'AWD' : 'RWD'}</span></div>
              <div className="info-row"><span className="info-row__label">Fuel Tank</span><span className="info-row__value">{v.fuel_capacity || 'N/A'} L</span></div>
              <div className="info-row"><span className="info-row__label">Weight</span><span className="info-row__value">{v.weight ? `${v.weight.toLocaleString()} kg` : 'N/A'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {showHoldModal && (
        <HoldModal
          title="Add Maintenance Hold"
          confirmLabel="Add Hold"
          defaultReason="Ongoing maintenance"
          onClose={() => setShowHoldModal(false)}
          onSubmit={addMaintenanceHold}
        />
      )}

      {showCompleteModal && (
        <CompleteMaintenanceModal
          vehicle={v}
          onClose={() => setShowCompleteModal(false)}
          onSubmit={completeMaintenance}
        />
      )}
    </Layout>
  );
}

function TireCell({ label, value, low }) {
  return (
    <div className="tire-cell">
      <div className="tire-cell__label">{label}</div>
      <div className={`tire-cell__value ${low ? 'tire-cell__value--low' : 'tire-cell__value--normal'}`}>{value}</div>
    </div>
  );
}

function FluidLevel({ name, value, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--on-surface)' }}>{name}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: value < 50 ? 'var(--warning)' : 'var(--success)' }}>{value}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar__fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function WrenchIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={props.style}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function HoldDetailModal({ hold, active, canRemove, saving, onBack, onRemove }) {
  const reason = hold.reason || hold.hold_reason || 'Vehicle hold';
  const location = hold.location_name || hold.location_code || 'Location unavailable';
  const action = hold.hold_action || 'Add';

  return (
    <div className="modal-overlay" onClick={onBack}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal__header">
          <span>{action === 'Remove' ? 'Hold Removed' : 'Hold Details'}</span>
          <button onClick={onBack} style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>&times;</button>
        </div>
        <div className="modal__body">
          <div style={{
            padding: 16,
            borderRadius: 'var(--radius-lg)',
            background: active ? 'var(--warning-container)' : 'var(--surface-container-low)',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: active ? '#92400e' : 'var(--on-surface)' }}>
                {reason}
              </div>
              <span className={`badge ${active ? 'badge--hold' : 'badge--verified'}`}>
                {active ? 'ACTIVE HOLD' : action === 'Remove' ? 'REMOVED' : 'LOGGED'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Logged Time</span>
              <span className="info-row__value">{formatDateTime(hold.timestamp, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Location</span>
              <span className="info-row__value">{location}</span>
            </div>
            <div className="info-row">
              <span className="info-row__label">Odometer</span>
              <span className="info-row__value">{hold.odometer ? `${formatNumber(hold.odometer)} km` : 'N/A'}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
            Hold removals are recorded as a new database event, so the full audit trail remains visible in Vehicle History.
          </p>
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onBack}>Back</button>
          {active && canRemove && (
            <button className="btn btn--success" onClick={onRemove} disabled={saving}>
              {saving ? 'Removing...' : 'Remove Hold'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActiveHoldList({ holds, saving, onRemove }) {
  if (!holds.length) {
    return (
      <div style={{ marginTop: 14, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', fontSize: '0.78rem' }}>
        No active holds for this vehicle.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {holds.map((hold) => (
        <div key={hold.event_id} style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--warning-container)', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.84rem' }}>{hold.reason || 'Vehicle hold'}</div>
            <div style={{ fontSize: '0.74rem', color: '#92400e', marginTop: 3 }}>
              Added {formatDate(hold.timestamp, { month: 'short', day: 'numeric', year: 'numeric' })}
              {hold.location_name ? ` at ${hold.location_name}` : hold.location_code ? ` at ${hold.location_code}` : ''}
              {hold.odometer ? ` | ${formatNumber(hold.odometer)} km` : ''}
            </div>
          </div>
          <button className="btn btn--success" onClick={() => onRemove(hold)} disabled={saving}>
            Remove Hold
          </button>
        </div>
      ))}
    </div>
  );
}

function HoldModal({ title, confirmLabel, defaultReason, onClose, onSubmit }) {
  const [reason, setReason] = useState(defaultReason || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Please enter a hold reason.');
      return;
    }

    setSaving(true);
    await onSubmit(reason.trim());
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <span>{title}</span>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>&times;</button>
        </div>
        <div className="modal__body">
          <div className="form-group">
            <label>Hold Reason</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Awaiting parts" />
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteMaintenanceModal({ vehicle, onClose, onSubmit }) {
  const [form, setForm] = useState({
    odometer: vehicle.odometer || '',
    next_pm: vehicle.next_pm || '',
    location_code: vehicle.location_code || '',
    reason: 'Maintenance completed',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    await onSubmit({
      ...form,
      odometer: form.odometer ? parseInt(form.odometer, 10) : null,
      next_pm: form.next_pm ? parseInt(form.next_pm, 10) : null,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <span>Complete Maintenance</span>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>&times;</button>
        </div>
        <div className="modal__body">
          <div className="form-row">
            <div className="form-group">
              <label>Current Odometer</label>
              <input type="number" value={form.odometer} onChange={(event) => handleChange('odometer', event.target.value)} />
            </div>
            <div className="form-group">
              <label>Next PM Due</label>
              <input type="number" value={form.next_pm} onChange={(event) => handleChange('next_pm', event.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Location Code</label>
            <input value={form.location_code} onChange={(event) => handleChange('location_code', event.target.value.toUpperCase())} />
          </div>
          <div className="form-group">
            <label>Completion Note</label>
            <input value={form.reason} onChange={(event) => handleChange('reason', event.target.value)} />
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Complete Service'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddVehicleModal({ locations, onClose, onSaved }) {
  const [form, setForm] = useState({
    vin: '',
    unit_number: '',
    year: '',
    make: '',
    model: '',
    trim: '',
    color: '',
    car_class: '',
    body_style: '',
    fuel_type: '',
    odometer: '',
    status: 'Available',
    location_code: '',
    next_pm: '',
    msrp: '',
    in_service_date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    const requiredFields = [
      ['vin', 'VIN'],
      ['unit_number', 'unit number'],
      ['year', 'year'],
      ['make', 'make'],
      ['model', 'model'],
      ['car_class', 'class'],
      ['odometer', 'mileage'],
      ['location_code', 'location'],
      ['in_service_date', 'service date'],
    ];
    const missing = requiredFields
      .filter(([field]) => form[field] === undefined || form[field] === null || String(form[field]).trim() === '')
      .map(([, label]) => label);

    if (missing.length > 0) {
      alert(`Please fill in required fields: ${missing.join(', ')}.`);
      return;
    }

    const year = parseInt(form.year, 10);
    const odometer = parseInt(form.odometer, 10);

    if (Number.isNaN(year) || year < 1900) {
      alert('Please enter a valid vehicle year.');
      return;
    }

    if (Number.isNaN(odometer) || odometer < 0) {
      alert('Please enter a valid non-negative mileage.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        vin: form.vin.trim().toUpperCase(),
        unit_number: form.unit_number.trim().toUpperCase(),
        year,
        odometer,
        car_class: form.car_class.trim().toUpperCase(),
        make: form.make.trim(),
        model: form.model.trim(),
        location_code: form.location_code.trim(),
      };
      await vehicleApi.create(payload);
      await onSaved();
    } catch (error) {
      alert(`Error creating vehicle: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <span>Add Vehicle</span>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>&times;</button>
        </div>
        <div className="modal__body">
          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginBottom: 16 }}>
            Required fields are marked with *. Other fields may be left blank.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>VIN *</label>
              <input value={form.vin} onChange={(e) => handleChange('vin', e.target.value.toUpperCase())} />
            </div>
            <div className="form-group">
              <label>Unit Number *</label>
              <input value={form.unit_number} onChange={(e) => handleChange('unit_number', e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Year *</label>
              <input type="number" value={form.year} onChange={(e) => handleChange('year', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                <option value="Available">Available</option>
                <option value="Rented">Rented</option>
                <option value="On Hold">On Hold</option>
                <option value="In Maintenance">In Maintenance</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Make *</label>
              <input value={form.make} onChange={(e) => handleChange('make', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Model *</label>
              <input value={form.model} onChange={(e) => handleChange('model', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Trim</label>
              <input value={form.trim} onChange={(e) => handleChange('trim', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input value={form.color} onChange={(e) => handleChange('color', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Class *</label>
              <input value={form.car_class} onChange={(e) => handleChange('car_class', e.target.value.toUpperCase())} placeholder="e.g. ICAR, SUV, PPBR" />
            </div>
            <div className="form-group">
              <label>Body Style</label>
              <input value={form.body_style} onChange={(e) => handleChange('body_style', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fuel Type</label>
              <input value={form.fuel_type} onChange={(e) => handleChange('fuel_type', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Location *</label>
              <select value={form.location_code} onChange={(e) => handleChange('location_code', e.target.value)}>
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
              <label>Mileage / Odometer *</label>
              <input type="number" value={form.odometer} onChange={(e) => handleChange('odometer', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Next PM</label>
              <input type="number" value={form.next_pm} onChange={(e) => handleChange('next_pm', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>MSRP</label>
              <input type="number" value={form.msrp} onChange={(e) => handleChange('msrp', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Service Date *</label>
              <input type="date" value={form.in_service_date} onChange={(e) => handleChange('in_service_date', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Create Vehicle'}
          </button>
        </div>
      </div>
    </div>
  );
}
