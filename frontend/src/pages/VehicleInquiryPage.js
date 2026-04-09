import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleApi } from '../api';
import VehicleSubHeader from '../components/VehicleSubHeader';

function VehicleInquiryPage({ vehicle, onVehicleLoad }) {
  const { unitOrVin } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('LOGISTICS');
  const [registration, setRegistration] = useState(null);
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
        setRegistration(regRes.data[0]);
        v = { ...v, plate: regRes.data[0].plate };
      }
      onVehicleLoadRef.current(v);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [unitOrVin]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="loading">Loading vehicle inquiry...</div>;
  if (!vehicle) return <div className="loading">Vehicle not found</div>;

  const tabs = ['LOGISTICS', 'VEHICLE INFO', 'INFLEETING'];

  return (
    <div>
      <VehicleSubHeader vehicle={vehicle} />

      <div className="page-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`page-tabs__tab ${activeTab === tab ? 'page-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {activeTab === 'LOGISTICS' && <LogisticsTab vehicle={vehicle} registration={registration} />}
        {activeTab === 'VEHICLE INFO' && <VehicleInfoTab vehicle={vehicle} />}
        {activeTab === 'INFLEETING' && <InfleetingTab vehicle={vehicle} registration={registration} />}
      </div>

      <button className="back-btn" onClick={() => navigate('/')}>
        &#8592; BACK
      </button>
    </div>
  );
}

function LogisticsTab({ vehicle, registration }) {
  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__header">Vehicle Summary</div>
        <div className="card__body">
          <div className="info-grid">
            <InfoItem label="Unit #" value={vehicle.unit_number} />
            <InfoItem label="VIN" value={vehicle.vin} />
            <InfoItem label="Year / Make / Model" value={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} />
            <InfoItem label="Color" value={vehicle.color} />
            <InfoItem label="Car Class" value={vehicle.car_class} />
            <InfoItem label="Status" value={vehicle.status} />
            <InfoItem label="Location" value={`${vehicle.location_code} (${vehicle.location_name || ''})`} />
            <InfoItem label="Odometer" value={vehicle.odometer?.toLocaleString()} />
            <InfoItem label="Plate" value={registration?.plate || 'N/A'} />
            <InfoItem label="Next PM" value={vehicle.next_pm?.toLocaleString() || 'N/A'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleInfoTab({ vehicle }) {
  return (
    <div>
      <div className="card">
        <div className="card__header">Details</div>
        <div className="card__body">
          <div className="info-grid">
            <InfoItem label="Car Class" value={vehicle.car_class} />
            <InfoItem label="Body Style" value={vehicle.body_style} />
            <InfoItem label="Fuel Type" value={vehicle.fuel_type} />
            <InfoItem label="Fuel Capacity" value={vehicle.fuel_capacity} />
            <InfoItem label="Engine Size" value={vehicle.engine_size} />
            <InfoItem label="Horsepower" value={vehicle.horsepower} />
            <InfoItem label="Tire Type" value={vehicle.tire_type} />
            <InfoItem label="# of Wheels" value={vehicle.num_wheels} />
            <InfoItem label="Weight" value={vehicle.weight?.toLocaleString()} />
            <InfoItem label="Seat Count" value={vehicle.seat_count} />
            <InfoItem label="MSRP" value={vehicle.msrp ? `$${parseFloat(vehicle.msrp).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'} />
            <InfoItem label="Vehicle Age" value={vehicle.vehicle_age ? `${vehicle.vehicle_age} year(s)` : 'New'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfleetingTab({ vehicle, registration }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="card">
        <div className="card__header">Registration</div>
        <div className="card__body">
          <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <InfoItem label="Plate" value={registration?.plate || 'N/A'} />
            <InfoItem label="Plate Type" value={registration?.plate_type || 'N/A'} />
            <InfoItem label="Effective Date" value={registration?.effective_date || 'N/A'} />
            <InfoItem label="Expiration Date" value={registration?.expiration_date || 'N/A'} />
            <InfoItem label="Location" value={registration?.location_code || 'N/A'} />
            <InfoItem label="Country" value={registration?.country || 'N/A'} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">Installation</div>
        <div className="card__body">
          <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <InfoItem label="Activation Date" value={vehicle.in_service_date || 'N/A'} />
            <InfoItem label="TU User ID" value="NONE" />
            <InfoItem label="Install Date" value={vehicle.in_service_date || 'N/A'} />
            <InfoItem label="Install Location" value={registration?.location_code || 'N/A'} />
            <InfoItem label="Last Update" value={vehicle.in_service_date || 'N/A'} />
            <InfoItem label="In-service Date" value={vehicle.in_service_date || 'N/A'} />
            <InfoItem label="Package" value={vehicle.package || 'N/A'} />
            <InfoItem label="New/Used" value={vehicle.new_or_used || 'New'} />
            <InfoItem label="Handicap Equipped" value={vehicle.handicap_equipped ? 'Yes' : 'No'} />
            <InfoItem label="Dealer" value={vehicle.dealer || 'N/A'} />
            <InfoItem label="Color" value={vehicle.color || 'N/A'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <span className="info-item__label">{label}</span>
      <span className="info-item__value">{value || '-'}</span>
    </div>
  );
}

export default VehicleInquiryPage;
