import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehicleApi, eventApi } from '../api';
import VehicleSubHeader from '../components/VehicleSubHeader';
import AddEventModal from '../components/AddEventModal';

function VehicleHistoryPage({ vehicle, onVehicleLoad, employee }) {
  const { unitOrVin } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [sortOrder, setSortOrder] = useState('Newest');
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
      const { data: evts } = await eventApi.getByVehicle(v.vin);
      setEvents(evts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [unitOrVin]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredEvents = activeTab === 'ALL'
    ? events
    : activeTab === 'NOTES'
      ? events.filter(e => e.event_type === 'note')
      : events.filter(e => ['rental', 'movement'].includes(e.event_type));

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const diff = new Date(b.timestamp) - new Date(a.timestamp);
    return sortOrder === 'Newest' ? diff : -diff;
  });

  const groupedByDate = sortedEvents.reduce((acc, evt) => {
    const date = new Date(evt.timestamp).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(evt);
    return acc;
  }, {});

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });

  const renderEvent = (evt) => {
    switch (evt.event_type) {
      case 'hold':
        return (
          <div className="timeline__event" key={evt.event_id}>
            <div className="timeline__event-header">
              <div>
                <div className="timeline__event-time">{formatTime(evt.timestamp)}</div>
                <div className="timeline__event-codes">
                  {evt.location_code}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="timeline__event-type">Hold</div>
                <div className="timeline__event-body">
                  <div><span className="label">Reason:</span><br />{evt.hold_reason}</div>
                  <div><span className="label">Action:</span><br />{evt.hold_action}</div>
                  <div><span className="label">Odometer:</span><br />{evt.odometer?.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'note':
        return (
          <div className="timeline__event" key={evt.event_id}>
            <div className="timeline__event-header">
              <div>
                <div className="timeline__event-time">{formatTime(evt.timestamp)}</div>
                <div className="timeline__event-codes">{evt.location_code}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="timeline__event-type">
                  {evt.note_content?.includes('Odometer') ? 'Vehicle Information' : 'Notes'}
                </div>
                <div className="timeline__event-body">
                  {evt.note_content?.includes('Odometer')
                    ? <div><span className="label">Event Comment:</span><br />{evt.note_content}</div>
                    : <div>{evt.note_content}</div>
                  }
                </div>
              </div>
            </div>
          </div>
        );

      case 'rental':
        return (
          <div className="timeline__event" key={evt.event_id}>
            <div className="timeline__event-header">
              <div>
                <div className="timeline__event-time">{formatTime(evt.timestamp)}</div>
                <div className="timeline__event-codes">{evt.location_code}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="timeline__event-type" style={{ marginBottom: 8 }}>
                  Rental / Movement
                </div>
                <div className="rental-card">
                  <div className="rental-card__side">
                    <div><span className="label">Agreement #:</span></div>
                    <div>{evt.agreement_number}</div>
                    <div>{evt.customer_name}</div>
                  </div>
                  <div className="rental-card__side">
                    <div><span className="label">Start:</span></div>
                    <div>{evt.start_location}{evt.start_location_name ? ` | ${evt.start_location_name}` : ''}</div>
                    <div>{evt.start_time ? new Date(evt.start_time).toLocaleString() : '-'}</div>
                    <div>Odometer Out: {evt.odometer_out?.toLocaleString()}</div>
                  </div>
                  <div className="rental-card__side">
                    <div><span className="label">Return:</span></div>
                    <div>{evt.return_location}{evt.return_location_name ? ` | ${evt.return_location_name}` : ''}</div>
                    <div>{evt.end_time ? new Date(evt.end_time).toLocaleString() : '-'}</div>
                    <div>Odometer In: {evt.odometer_in?.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'maintenance':
        return (
          <div className="timeline__event" key={evt.event_id}>
            <div className="timeline__event-header">
              <div>
                <div className="timeline__event-time">{formatTime(evt.timestamp)}</div>
                <div className="timeline__event-codes">{evt.location_code}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="timeline__event-type">
                  {evt.maint_subtype || 'Repair'}
                </div>
                <div className="timeline__event-body">
                  <div><span className="label">Reason:</span><br />{evt.maint_reason}</div>
                  <div><span className="label">Action:</span><br />{evt.maint_action}</div>
                  {evt.odometer && <div><span className="label">Odometer:</span><br />{evt.odometer?.toLocaleString()}</div>}
                </div>
              </div>
            </div>
          </div>
        );

      case 'condition_check':
        return (
          <div className="timeline__event" key={evt.event_id}>
            <div className="timeline__event-header">
              <div>
                <div className="timeline__event-time">{formatTime(evt.timestamp)}</div>
                <div className="timeline__event-codes">{evt.location_code}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="timeline__event-type">Condition Check</div>
                <div className="timeline__event-body">
                  <div><span className="label">Fuel Level:</span><br />{evt.fuel_level || 'N/A'}</div>
                  <div><span className="label">Odometer:</span><br />{evt.odometer?.toLocaleString()}</div>
                  {evt.cc_notes && <div><span className="label">Notes:</span><br />{evt.cc_notes}</div>}
                </div>
              </div>
            </div>
          </div>
        );

      case 'movement':
        return (
          <div className="timeline__event" key={evt.event_id}>
            <div className="timeline__event-header">
              <div>
                <div className="timeline__event-time">{formatTime(evt.timestamp)}</div>
                <div className="timeline__event-codes">{evt.location_code}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="timeline__event-type">Movement</div>
                <div className="timeline__event-body">
                  <div><span className="label">From:</span><br />{evt.from_location} {evt.from_location_name ? `(${evt.from_location_name})` : ''}</div>
                  <div><span className="label">To:</span><br />{evt.to_location} {evt.to_location_name ? `(${evt.to_location_name})` : ''}</div>
                  {evt.odometer && <div><span className="label">Odometer:</span><br />{evt.odometer?.toLocaleString()}</div>}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) return <div className="loading">Loading vehicle history...</div>;

  return (
    <div>
      <VehicleSubHeader vehicle={vehicle} />

      <div className="page-tabs">
        {['ALL', 'NOTES', 'RENTAL/MOVEMENT'].map(tab => (
          <button
            key={tab}
            className={`page-tabs__tab ${activeTab === tab ? 'page-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} {tab === 'ALL' ? `(${events.length})` : ''}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="add-comment-btn" onClick={() => setShowAddEvent(true)}>
          ADD COMMENT
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-bar__left">
          <div className="sort-select">
            <label>Sort by:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option>Newest</option>
              <option>Oldest</option>
            </select>
          </div>
        </div>
        <div className="filter-bar__right">
          <button className="filter-bar__btn">&#9776; FILTER</button>
          <button className="filter-bar__btn">&#8681; EXPORT</button>
          <button className="filter-bar__btn" onClick={loadData}>&#8635; REFRESH</button>
        </div>
      </div>

      <div className="timeline">
        {Object.entries(groupedByDate).map(([date, evts]) => (
          <div className="timeline__date-group" key={date}>
            <div className="timeline__date">{date}</div>
            {evts.map(renderEvent)}
          </div>
        ))}
        {sortedEvents.length === 0 && (
          <div className="empty-state">
            <h3>No events found</h3>
            <p>No event history for this filter.</p>
          </div>
        )}
      </div>

      <button className="back-btn" onClick={() => navigate('/')}>
        &#8592; BACK
      </button>

      {showAddEvent && vehicle && (
        <AddEventModal
          vehicle={vehicle}
          employee={employee}
          onClose={() => setShowAddEvent(false)}
          onSaved={() => { setShowAddEvent(false); loadData(); }}
        />
      )}
    </div>
  );
}

export default VehicleHistoryPage;
