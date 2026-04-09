import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleApi, conditionApi } from '../api';
import VehicleSubHeader from '../components/VehicleSubHeader';

const VEHICLE_VIEWS = [
  { id: 'driver-front',   label: 'Driver Front Quarter',  icon: '🚗' },
  { id: 'driver-side',    label: 'Driver Side',           icon: '🚙' },
  { id: 'front',          label: 'Front',                 icon: '🚘' },
  { id: 'rear',           label: 'Rear',                  icon: '🚐' },
  { id: 'passenger-front',label: 'Pass. Front Quarter',   icon: '🚗' },
  { id: 'passenger-side', label: 'Passenger Side',        icon: '🚙' },
  { id: 'top',            label: 'Top',                   icon: '🔲' },
  { id: 'interior',       label: 'Interior',              icon: '🪑' },
];

function ConditionPage({ vehicle, onVehicleLoad }) {
  const { unitOrVin } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('EXTERIOR');
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const { data: dmg } = await conditionApi.getDamages(v.vin);
      setDamages(dmg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [unitOrVin]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="loading">Loading condition data...</div>;

  const damageCount = damages.filter(d => d.damage_type === 'Damage').length;
  const wearCount = damages.filter(d => d.damage_type === 'Wear and Tear').length;
  const views = activeTab === 'EXTERIOR'
    ? VEHICLE_VIEWS.filter(v => v.id !== 'interior')
    : VEHICLE_VIEWS.filter(v => v.id === 'interior');

  return (
    <div>
      <VehicleSubHeader vehicle={vehicle} />

      <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Condition</h2>
        <div className="page-tabs" style={{ padding: 0, background: 'transparent' }}>
          {['EXTERIOR', 'INTERIOR'].map(tab => (
            <button
              key={tab}
              className={`page-tabs__tab ${activeTab === tab ? 'page-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
          <button className="page-tabs__tab" style={{ marginLeft: 'auto' }}>&#9776;</button>
        </div>
      </div>

      <div className="condition-diagrams">
        {views.map(view => (
          <div className="diagram-view" key={view.id}>
            <div className="diagram-view__icon">{view.icon}</div>
            <span className="diagram-view__label">+ ADD</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span className="diagram-view__label">+ ADD OTHER CONDITION</span>
      </div>

      <div className="damage-legend">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked={false} />
          <span className="damage-legend__dot damage-legend__dot--damage" />
          Damage ({damageCount})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" defaultChecked={false} />
          <span className="damage-legend__dot damage-legend__dot--wear" />
          Wear and Tear ({wearCount})
        </label>
      </div>

      {damages.length > 0 && (
        <div style={{ padding: '12px 24px' }}>
          <div className="card">
            <div className="card__header">Damage Reports</div>
            <div className="card__body">
              {damages.map((d, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 16, alignItems: 'center',
                  padding: '8px 0', borderBottom: i < damages.length - 1 ? '1px solid var(--border-light)' : 'none'
                }}>
                  <span className={`damage-legend__dot ${d.damage_type === 'Damage' ? 'damage-legend__dot--damage' : 'damage-legend__dot--wear'}`} />
                  <div style={{ flex: 1, fontSize: '0.85rem' }}>
                    <strong>{d.body_area}</strong> - {d.damage_type}
                    {d.severity && <span style={{ color: 'var(--text-secondary)' }}> ({d.severity})</span>}
                    {d.description && <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{d.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <button className="back-btn" onClick={() => navigate('/')}>
        &#8592; BACK
      </button>
    </div>
  );
}

export default ConditionPage;
