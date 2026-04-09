import React from 'react';

function VehicleSubHeader({ vehicle }) {
  if (!vehicle) return null;

  const statusClass = {
    'Available': 'status-badge--available',
    'Rented': 'status-badge--rented',
    'On Hold': 'status-badge--hold',
    'In Maintenance': 'status-badge--maintenance',
  }[vehicle.status] || '';

  return (
    <div className="sub-header">
      <div className="sub-header__vehicle-info">
        <div>
          <div className="sub-header__vehicle-title">
            <span style={{ fontSize: '1.1rem' }}>&#128663;</span>
            {vehicle.color} {vehicle.year} {vehicle.make.toUpperCase()} {vehicle.model} {vehicle.trim} ({vehicle.car_class})
          </div>
          <span className={`status-badge status-badge--pm`} style={{ marginTop: 4 }}>
            {vehicle.status === 'On Hold' ? 'PM' : vehicle.status}
          </span>
        </div>
        <div className="sub-header__details">
          <div><span className="label">VIN:</span> {vehicle.vin}</div>
          <div><span className="label">Diesel:</span> -</div>
          <div><span className="label">Details:</span></div>
          <div><span className="label">Unit #:</span> {vehicle.unit_number}</div>
          <div><span className="label">Odometer:</span> {vehicle.odometer?.toLocaleString()}</div>
          <div><span className="label">Next PM:</span> {vehicle.next_pm?.toLocaleString() || 'N/A'}</div>
          <div><span className="label">Plate:</span> {vehicle.plate || 'N/A'} ({vehicle.package || '-'})</div>
          <div><span className="label">Location:</span> {vehicle.location_code}</div>
        </div>
      </div>
    </div>
  );
}

export default VehicleSubHeader;
