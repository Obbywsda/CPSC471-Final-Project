import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { vehicleApi, eventApi, maintenanceApi } from '../api';
import { formatDate, formatNumber } from '../utils/formatters';
import {
  Plus, Filter, Download, Edit3, Trash2, Eye,
  ClipboardCheck, AlertTriangle, Clock, CheckCircle,
  ChevronRight, ExternalLink, FileText,
} from 'lucide-react';

export default function Maintenance() {
  const { isMechanic, canEdit } = useAuth();
  return isMechanic ? <MechanicMaintenance /> : <ManagerMaintenance canEdit={canEdit} />;
}

/* ============================================= */
/* MANAGER / EMPLOYEE MAINTENANCE                */
/* ============================================= */
function ManagerMaintenance({ canEdit }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadMaintenance = async () => {
    setLoading(true);
    try {
      const [taskResponse, statsResponse] = await Promise.all([
        maintenanceApi.getTasks(),
        maintenanceApi.getStats(),
      ]);
      setTasks(taskResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenance();
  }, []);

  const completeTask = async (task) => {
    try {
      await eventApi.create({
        event_type: 'maintenance',
        vin: task.vin,
        employee_id: user?.id || null,
        location_code: task.location_code,
        odometer: task.odometer,
        reason: task.reason,
        action: 'Remove',
        subtype: task.subtype,
      });
      await loadMaintenance();
    } catch (error) {
      alert(`Error completing maintenance task: ${error.response?.data?.error || error.message}`);
    }
  };

  const totalTasks = Number(stats?.total ?? tasks.length);
  const overdue = Number(stats?.overdue ?? tasks.filter(t => t.status === 'Overdue').length);
  const inProgress = Number(stats?.in_progress ?? tasks.filter(t => t.status === 'In Progress').length);
  const completed = Number(stats?.completed ?? tasks.filter(t => t.status === 'Completed').length);

  return (
    <Layout title="Maintenance Control">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <h1 className="page-header__title">Fleet Service Ledger</h1>
            <p className="page-header__subtitle">Global oversight and maintenance scheduling</p>
          </div>
          {canEdit && (
            <button className="btn btn--primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add Maintenance Task
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-cards">
        <StatCard label="Total Tasks" value={totalTasks} icon={ClipboardCheck} sub="Database-tracked maintenance events" />
        <StatCard label="Overdue" value={overdue} icon={AlertTriangle} sub="Requires immediate action" color="var(--error)" />
        <StatCard label="In Progress" value={inProgress} icon={Clock} sub="Open maintenance actions" color="var(--info)" />
        <StatCard label="Completed" value={completed} icon={CheckCircle} sub="Closed maintenance actions" color="var(--success)" />
      </div>

      {/* Active Maintenance Registry */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card__header">
          <span className="card__header-title">Active Maintenance Registry</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--ghost"><Filter size={14} /></button>
            <button className="btn btn--ghost"><Download size={14} /></button>
          </div>
        </div>
        <div className="card__body--full">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit & Identity</th>
                <th>Service Task</th>
                <th>Status</th>
                <th>Timeline</th>
                <th>Technician</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => (
                <tr key={task.event_id || i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-md)',
                        background: 'var(--primary-container)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)', fontSize: '0.75rem',
                      }}>&#128663;</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Unit #{task.unit_number || 'N/A'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>
                          VIN: {task.vin ? task.vin.substring(0, 12) + '...' : 'N/A'}<br />
                          PLATE: {task.plate || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{task.reason || 'No reason provided'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{task.subtype || 'General maintenance'}</div>
                  </td>
                  <td>
                    <span className={`badge ${
                      task.status === 'Overdue' ? 'badge--overdue'
                      : task.status === 'In Progress' ? 'badge--in-progress'
                      : task.status === 'Scheduled' ? 'badge--scheduled'
                      : 'badge--completed'
                    }`}>{task.status || 'Overdue'}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      {formatDate(task.timestamp, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: task.status === 'Overdue' ? 'var(--error)' : 'var(--on-surface-variant)' }}>
                      {task.location_name || task.location_code || 'Location unavailable'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: task.employee_id ? 'var(--primary-container)' : 'var(--surface-container-high)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)',
                      }}>
                        {task.employee_id ? task.employee_id.substring(0, 2) : '--'}
                      </div>
                      <span style={{ fontSize: '0.82rem' }}>{task.technician_name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit && task.status !== 'Completed' && (
                        <button className="btn btn--ghost" onClick={() => completeTask(task)}>
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {canEdit && task.status === 'Completed' && (
                        <button className="btn btn--ghost" disabled title="Completed tasks are read-only">
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>
                    No maintenance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>Showing {tasks.length} maintenance records</span>
          <div className="pagination__pages">
            <button className="pagination__btn pagination__btn--active">1</button>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-8-4">
        {/* Throughput */}
        <div className="card">
          <div className="card__header">
            <span className="card__header-title">Service Center Throughput</span>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} /> Capacity
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--on-surface-variant)' }} /> Actual
              </span>
            </div>
          </div>
          <div className="card__body">
            <ThroughputRow name="North Main Bay" value={92} color="var(--primary)" />
            <ThroughputRow name="East Logistics Hub" value={45} color="var(--primary)" />
            <ThroughputRow name="Mobile Service Unit A" value={100} color="var(--error)" />
          </div>
        </div>

        {/* Expedited Parts CTA */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dim))',
          borderRadius: 'var(--radius-lg)', padding: 28, color: 'white',
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
            Need Expedited Parts?
          </h3>
          <p style={{ fontSize: '0.82rem', opacity: 0.85, marginBottom: 20, lineHeight: 1.5 }}>
            Access the emergency supply chain portal for components required in overdue tasks.
          </p>
          <button className="btn btn--secondary" style={{ background: 'white', color: 'var(--primary)' }}>
            Open Procurement Portal <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {showAddModal && <AddMaintenanceModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadMaintenance(); }} />}
    </Layout>
  );
}

/* ============================================= */
/* MECHANIC MAINTENANCE                          */
/* ============================================= */
function MechanicMaintenance() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeHolds, setActiveHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const loadMechanicQueue = async (preferredVin) => {
    setLoading(true);
    try {
      const { data } = await vehicleApi.getAll();
      setVehicles(data);
      const target = data.find((vehicle) => vehicle.vin === preferredVin)
        || data.find((vehicle) => vehicle.status === 'In Maintenance')
        || data.find((vehicle) => vehicle.status === 'On Hold')
        || data[0];
      setSelectedVehicle(target);
      if (target) {
        const [evtRes, holdRes] = await Promise.all([
          eventApi.getByVehicle(target.vin),
          vehicleApi.getHolds(target.vin),
        ]);
        setEvents(evtRes.data);
        setActiveHolds(holdRes.data);
      } else {
        setEvents([]);
        setActiveHolds([]);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadMechanicQueue();
  }, []);

  if (loading) return <Layout title="Maintenance Terminal" badge="MECH_VIEW"><div className="loading-state">Loading...</div></Layout>;

  const v = selectedVehicle;
  const maintenanceEvents = events.filter(e => ['maintenance', 'condition_check'].includes(e.event_type));
  const activeHoldCount = activeHolds.length;

  const addMaintenanceHold = async (reason) => {
    if (!v) return;
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
      await loadMechanicQueue(v.vin);
    } catch (error) {
      alert(`Error adding hold: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeMaintenanceHold = async (hold) => {
    if (!v) return;
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
      await loadMechanicQueue(v.vin);
    } catch (error) {
      alert(`Error removing hold: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const completeMaintenance = async (updates) => {
    if (!v) return;
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
      await loadMechanicQueue(v.vin);
    } catch (error) {
      alert(`Error finalizing service: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Maintenance Terminal" badge="MECH_VIEW">
      {v && (
        <>
          {/* Service Ticket Header */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <div className="page-header__breadcrumb">SERVICE TICKET #ME-{v.unit_number}</div>
              <h1 className="vehicle-header__title" style={{ marginBottom: 8 }}>{v.year} {v.make} {v.model} {v.trim}</h1>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>VIN: {v.vin}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--on-surface-variant)' }}>Odometer: {formatNumber(v.odometer)} km</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn--secondary"><FileText size={16} /> Full Diagnostic Report</button>
                <button className="btn btn--secondary" onClick={() => setShowHoldModal(true)} disabled={saving}>
                  <AlertTriangle size={16} /> Add Hold
                </button>
                <button className="btn btn--success" onClick={() => setShowCompleteModal(true)} disabled={saving}>
                  <CheckCircle size={16} /> Finalize Service
                </button>
              </div>
            </div>
            <div style={{
              width: 220, height: 160, background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <span style={{ fontSize: '3.5rem', opacity: 0.3 }}>&#128663;</span>
              <div className="condition-dot condition-dot--damage" style={{ top: '25%', right: '20%' }} />
              <div className="condition-dot condition-dot--inspection" style={{ bottom: '25%', left: '30%' }} />
            </div>
          </div>

          {/* Vehicle Stats */}
          <div className="stat-cards" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card__label">Battery Health</div>
              <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>
                {v.fuel_type === 'Electric' ? '98.4%' : 'N/A'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Brake Wear (F/R)</div>
              <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>8/10 <span style={{ fontSize: '0.82rem' }}>mm</span></div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Software Version</div>
              <div className="stat-card__value" style={{ fontSize: '1.2rem' }}>v11.1</div>
              <div className="stat-card__sub" style={{ color: 'var(--success)' }}>Latest Installed</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Tyre Pressure</div>
              <div className="stat-card__value" style={{ fontSize: '1.5rem' }}>38.2 <span style={{ fontSize: '0.82rem' }}>PSI</span></div>
              <div className="stat-card__sub">Standard (Cold)</div>
            </div>
          </div>

          {/* Tasks + Side Panels */}
          <div className="grid-8-4">
            {/* Service Schedule */}
            <div className="card">
              <div className="card__header">
                <span className="card__header-title">Service Schedule & Active Tasks</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn--ghost"><Filter size={14} /></button>
                  <button className="btn btn--ghost" style={{ transform: 'rotate(0deg)' }}>&#8635;</button>
                </div>
              </div>
              <div className="card__body--full">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID / Task</th>
                      <th>Priority</th>
                      <th>Estimated Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(maintenanceEvents.length > 0 ? maintenanceEvents : MECHANIC_TASKS).map((task, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600 }}>#{task.id || task.event_id}</div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{task.name || task.maint_reason || 'Condition inspection'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{task.desc || task.maint_subtype || task.cc_notes || 'Database event log entry'}</div>
                        </td>
                        <td>
                          <span className={`badge ${
                            task.priority === 'HIGH' ? 'badge--overdue'
                            : task.priority === 'LOW' ? 'badge--scheduled'
                            : task.event_type === 'condition_check' ? 'badge--scheduled'
                            : 'badge--in-progress'
                          }`}>{task.priority || (task.event_type === 'condition_check' ? 'CHECK' : 'NORMAL')}</span>
                        </td>
                        <td>{task.time || formatDate(task.timestamp, { month: 'short', day: 'numeric' })}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: task.status === 'Completed' ? 'var(--success)' : task.status === 'In Progress' ? 'var(--primary)' : 'var(--on-surface-variant)',
                            }} />
                            {task.status || (task.event_type === 'condition_check' ? 'Completed' : 'Logged')}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn--ghost" style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>
                            {task.status === 'In Progress' ? 'Update' : task.status === 'Pending' ? 'Start' : 'View Log'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side Panels */}
            <div>
              {activeHoldCount > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card__header">
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active Holds</span>
                  </div>
                  <div className="card__body">
                    <MechanicActiveHoldList holds={activeHolds} saving={saving} onRemove={removeMaintenanceHold} />
                  </div>
                </div>
              )}

              {/* Parts Requisition */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card__header">
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Parts Requisition</span>
                </div>
                <div className="card__body">
                  <div style={{ display: 'flex', gap: 12, padding: '8px 0', alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#128276;</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Dot 4 Fluid (5L)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>Bin: A4-99</div>
                    </div>
                    <span className="badge badge--ready">READY</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, padding: '8px 0', alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#9881;</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>HV Sealant Kit</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>ETD: 2 Hours</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--error)' }}>OUT</span>
                  </div>
                  <button className="btn btn--secondary" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}>
                    REQUEST NEW PARTS
                  </button>
                </div>
              </div>

              {/* Active Notes */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card__header">
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active Notes</span>
                  <button className="btn btn--ghost"><Edit3 size={14} /></button>
                </div>
                <div className="card__body">
                  <div className="notes-panel">
                    "Found slight weeping near rear left caliper. Needs pressure test after fluid flush is completed. O-ring may require replacement next service cycle."
                    <div className="notes-panel__author">&mdash; J. Miller (Sr. Mech)</div>
                  </div>
                  <input placeholder="Add technical observation..." style={{ width: '100%' }} />
                </div>
              </div>

              {/* Service Guide */}
              <div style={{
                background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)',
                padding: 20, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-container)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Service Guide</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>Access OEM Repair Manual</div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--on-surface-variant)' }} />
              </div>
            </div>
          </div>

          {/* FAB */}
          <div style={{ position: 'fixed', bottom: 80, right: 32, zIndex: 90 }}>
            <button
              className="btn btn--primary"
              style={{ borderRadius: '50%', width: 48, height: 48, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowHoldModal(true)}
              disabled={saving}
            >
              <Plus size={20} />
            </button>
          </div>
        </>
      )}
      {showHoldModal && (
        <MechanicHoldModal
          onClose={() => setShowHoldModal(false)}
          onSubmit={addMaintenanceHold}
        />
      )}
      {showCompleteModal && (
        <MechanicCompleteModal
          vehicle={v}
          onClose={() => setShowCompleteModal(false)}
          onSubmit={completeMaintenance}
        />
      )}
    </Layout>
  );
}

/* ============================================= */
/* HELPERS & MOCK DATA                           */
/* ============================================= */

function StatCard({ label, value, icon: Icon, sub, color }) {
  return (
    <div className="stat-card" style={color ? { borderLeft: `3px solid ${color}` } : {}}>
      <div className="stat-card__top">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__icon"><Icon size={18} /></div>
      </div>
      <div className="stat-card__value" style={color ? { color } : {}}>{String(value).padStart(2, '0')}</div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}

function ThroughputRow({ name, value, color }) {
  return (
    <div className="throughput-row">
      <div className="throughput-row__label">
        <span className="throughput-row__name">{name}</span>
        <span className="throughput-row__value">{value}% Utilization</span>
      </div>
      <div className="throughput-row__bar">
        <div className="throughput-row__bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function MechanicActiveHoldList({ holds, saving, onRemove }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {holds.map((hold) => (
        <div key={hold.event_id} style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--warning-container)' }}>
          <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.84rem' }}>{hold.reason || 'Vehicle hold'}</div>
          <div style={{ fontSize: '0.74rem', color: '#92400e', marginTop: 3, marginBottom: 10 }}>
            Added {formatDate(hold.timestamp, { month: 'short', day: 'numeric', year: 'numeric' })}
            {hold.location_name ? ` at ${hold.location_name}` : hold.location_code ? ` at ${hold.location_code}` : ''}
            {hold.odometer ? ` | ${formatNumber(hold.odometer)} km` : ''}
          </div>
          <button className="btn btn--success" onClick={() => onRemove(hold)} disabled={saving}>
            Remove Hold
          </button>
        </div>
      ))}
    </div>
  );
}

function MechanicHoldModal({ onClose, onSubmit }) {
  const [reason, setReason] = useState('Ongoing maintenance');
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
          <span>Add Maintenance Hold</span>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>&times;</button>
        </div>
        <div className="modal__body">
          <div className="form-group">
            <label>Hold Reason</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Add Hold'}</button>
        </div>
      </div>
    </div>
  );
}

function MechanicCompleteModal({ vehicle, onClose, onSubmit }) {
  const [form, setForm] = useState({
    odometer: vehicle?.odometer || '',
    next_pm: vehicle?.next_pm || '',
    location_code: vehicle?.location_code || '',
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
          <span>Finalize Service</span>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>&times;</button>
        </div>
        <div className="modal__body">
          <div className="form-row">
            <div className="form-group">
              <label>Updated Odometer</label>
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
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Finalize Service'}</button>
        </div>
      </div>
    </div>
  );
}

const MECHANIC_TASKS = [
  { id: 'T-8821', name: 'Brake Fluid Flush & Bleed', desc: 'Full system purge using DOT 4 Low Viscosity', priority: 'HIGH', time: '1.5 hrs', status: 'In Progress' },
  { id: 'T-8824', name: 'HV Battery Terminal Cleaning', desc: 'Inspection for oxidation and torque check', priority: 'NORMAL', time: '0.8 hrs', status: 'Pending' },
  { id: 'T-8819', name: 'Software Patch 2.1-A', desc: 'Autopilot sensor recalibration sequence', priority: 'LOW', time: '0.5 hrs', status: 'Completed' },
];

function AddMaintenanceModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ vin: '', reason: '', subtype: '', priority: 'NORMAL' });
  const [vehicles, setVehicles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    vehicleApi.getAll().then(r => setVehicles(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!form.vin || !form.reason) { alert('Please fill required fields'); return; }
    setSaving(true);
    try {
      await eventApi.create({
        event_type: 'maintenance',
        vin: form.vin,
        employee_id: 'E22DD7',
        location_code: vehicles.find(v => v.vin === form.vin)?.location_code || 'C545',
        odometer: vehicles.find(v => v.vin === form.vin)?.odometer || null,
        reason: form.reason,
        action: 'Add',
        subtype: form.subtype,
      });
      onSaved();
    } catch (err) { alert('Error: ' + (err.response?.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <span>Add Maintenance Task</span>
          <button onClick={onClose} style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)' }}>&times;</button>
        </div>
        <div className="modal__body">
          <div className="form-group">
            <label>Vehicle</label>
            <select value={form.vin} onChange={(e) => setForm(p => ({ ...p, vin: e.target.value }))}>
              <option value="">Select vehicle...</option>
              {vehicles.map(v => <option key={v.vin} value={v.vin}>{v.unit_number} - {v.year} {v.make} {v.model}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Reason / Task</label>
            <input value={form.reason} onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Full Brake System Overhaul" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Subtype</label>
              <input value={form.subtype} onChange={(e) => setForm(p => ({ ...p, subtype: e.target.value }))} placeholder="e.g. Preventative" />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Create Task'}</button>
        </div>
      </div>
    </div>
  );
}
