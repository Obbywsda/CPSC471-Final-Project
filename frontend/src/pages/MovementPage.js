import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleApi, eventApi, locationApi } from '../api';
import VehicleSubHeader from '../components/VehicleSubHeader';

function MovementPage({ vehicle, onVehicleLoad, employee }) {
  const { unitOrVin } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    from_location: '',
    to_location: '',
    odometer: '',
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
        v = { ...v, plate: regRes.data[0].plate };
      }
      onVehicleLoadRef.current(v);
      setForm(prev => ({
        ...prev,
        from_location: v.location_code || '',
        odometer: v.odometer || '',
      }));
      const { data: locs } = await locationApi.getAll();
      setLocations(locs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [unitOrVin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!form.to_location) {
      alert('Please select a destination location');
      return;
    }
    setSaving(true);
    try {
      await eventApi.create({
        event_type: 'movement',
        vin: vehicle.vin,
        employee_id: employee.employee_id,
        location_code: form.from_location,
        odometer: form.odometer ? parseInt(form.odometer) : null,
        from_location: form.from_location,
        to_location: form.to_location,
      });

      await vehicleApi.update(vehicle.vin, { location_code: form.to_location });

      setToast('Location Saved');
      setTimeout(() => {
        setToast(null);
        navigate('/');
      }, 1500);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <VehicleSubHeader vehicle={vehicle} />

      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 20 }}>Movement</h2>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card__header">Move Vehicle</div>
          <div className="card__body">
            <div className="form-group">
              <label>Current Location (From)</label>
              <select
                value={form.from_location}
                onChange={(e) => setForm(prev => ({ ...prev, from_location: e.target.value }))}
              >
                <option value="">Select...</option>
                {locations.map(l => (
                  <option key={l.location_code} value={l.location_code}>
                    {l.location_code} - {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Destination (To)</label>
              <select
                value={form.to_location}
                onChange={(e) => setForm(prev => ({ ...prev, to_location: e.target.value }))}
              >
                <option value="">Select destination...</option>
                {locations.map(l => (
                  <option key={l.location_code} value={l.location_code}>
                    {l.location_code} - {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Odometer</label>
              <input
                type="number"
                value={form.odometer}
                onChange={(e) => setForm(prev => ({ ...prev, odometer: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn--secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Movement'}
          </button>
        </div>
      </div>

      <button className="back-btn" onClick={() => navigate('/')}>
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

export default MovementPage;
