import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleApi, eventApi } from '../api';

const DEFAULT_EQUIPMENT = [
  { item_name: 'Key 1', status: 'Present' },
  { item_name: 'Key 2', status: 'Present' },
  { item_name: 'Spare Tire/Inflator Kit', status: 'Present' },
];

function ConditionCapturePage({ vehicle, onVehicleLoad, employee }) {
  const { unitOrVin } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [form, setForm] = useState({
    odometer: '',
    fuel_level: '',
    notes: '',
    equipment: DEFAULT_EQUIPMENT.map(e => ({ ...e })),
  });
  const vehicleRef = useRef(vehicle);
  const onVehicleLoadRef = useRef(onVehicleLoad);
  vehicleRef.current = vehicle;
  onVehicleLoadRef.current = onVehicleLoad;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let v = vehicleRef.current;
      if (!v || (v.unit_number !== unitOrVin && v.vin !== unitOrVin)) {
        const { data } = await vehicleApi.getByVin(unitOrVin);
        v = data;
      }
      const regRes = await vehicleApi.getRegistration(v.vin);
      if (regRes.data.length > 0) {
        setRegistration(regRes.data[0]);
        v = { ...v, plate: regRes.data[0].plate };
      }
      onVehicleLoadRef.current(v);
      setForm(prev => ({ ...prev, odometer: v.odometer || '' }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [unitOrVin]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleEquipment = (index, status) => {
    setForm(prev => {
      const equipment = [...prev.equipment];
      equipment[index] = { ...equipment[index], status };
      return { ...prev, equipment };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await eventApi.create({
        event_type: 'condition_check',
        vin: vehicle.vin,
        employee_id: employee.employee_id,
        location_code: vehicle.location_code,
        odometer: form.odometer ? parseInt(form.odometer) : null,
        fuel_level: form.fuel_level || null,
        notes: form.notes || null,
        equipment: form.equipment,
      });
      setToast('Condition saved successfully');
      setTimeout(() => {
        setToast(null);
        navigate(`/vehicle-history/${vehicle.unit_number}`);
      }, 1500);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!vehicle) return <div className="loading">Vehicle not found</div>;

  return (
    <div className="condition-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Condition - {employee.location}
        </h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }}>Need Help?</span>
      </div>

      <div className="condition-vehicle-header">
        <h2>Vehicle Condition</h2>
        <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>
          {vehicle.year} {vehicle.make} {vehicle.model} Crew Cab, <span>{vehicle.color}</span>
          {' '}<span style={{ fontSize: '1.1rem' }}>&#128663;</span>
        </div>
        <div className="meta">
          <span><strong>Unit #:</strong> {vehicle.unit_number}</span>
          <span><strong>LP#:</strong> {registration?.plate || 'N/A'}</span>
          <span><strong>VIN:</strong> ...{vehicle.vin.slice(-6)}</span>
          <span><strong>State:</strong> {vehicle.package || '-'}</span>
        </div>
      </div>

      <div className="odometer-fuel-section">
        <h3>Enter Odometer and Fuel</h3>
        <div className="fields">
          <div className="field-group">
            <label>Odometer</label>
            <input
              type="number"
              value={form.odometer}
              onChange={(e) => setForm(prev => ({ ...prev, odometer: e.target.value }))}
              style={{ width: 160 }}
            />
          </div>
          <div className="field-group">
            <label>Fuel Level (Optional)</label>
            <select
              value={form.fuel_level}
              onChange={(e) => setForm(prev => ({ ...prev, fuel_level: e.target.value }))}
              style={{ width: 200 }}
            >
              <option value="">Fuel Level (Optional)</option>
              <option value="Full">Full</option>
              <option value="3/4">3/4</option>
              <option value="1/2">1/2</option>
              <option value="1/4">1/4</option>
              <option value="Empty">Empty</option>
            </select>
          </div>
        </div>
      </div>

      <div className="equipment-section">
        <h3>Review and Approve Equipment and Condition</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>Equipment</p>
        <div className="equipment-grid">
          {form.equipment.map((eq, idx) => (
            <div className="equipment-item" key={eq.item_name}>
              <span className="equipment-item__name">{eq.item_name}</span>
              <div className="equipment-item__toggles">
                <button
                  className={`toggle-btn ${eq.status === 'Present' ? 'toggle-btn--active-present' : ''}`}
                  onClick={() => toggleEquipment(idx, 'Present')}
                >
                  Present &#10003;
                </button>
                <button
                  className={`toggle-btn ${eq.status === 'Missing' ? 'toggle-btn--active-missing' : ''}`}
                  onClick={() => toggleEquipment(idx, 'Missing')}
                >
                  Missing &#10007;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
        <div className="page-tabs" style={{ padding: 0, background: 'transparent', borderBottom: 'none' }}>
          <button className="page-tabs__tab page-tabs__tab--active">EXTERIOR</button>
          <button className="page-tabs__tab">INTERIOR</button>
          <button className="page-tabs__tab">&#9776;</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 0' }}>
        <button className="btn btn--secondary" onClick={() => navigate(-1)}>Cancel</button>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Condition'}
        </button>
      </div>

      <button className="back-btn" onClick={() => navigate('/')} style={{ padding: '8px 0' }}>
        &#8592; BACK
      </button>

      {toast && (
        <div className="toast">
          <span>&#10003;</span> {toast}
        </div>
      )}
    </div>
  );
}

export default ConditionCapturePage;
