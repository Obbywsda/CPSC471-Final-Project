import React, { useState, useEffect } from 'react';
import { eventApi, locationApi, customerApi } from '../api';

function AddEventModal({ vehicle, employee, onClose, onSaved }) {
  const [eventType, setEventType] = useState('note');
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    location_code: vehicle?.location_code || '',
    odometer: vehicle?.odometer || '',
    content: '',
    reason: '',
    action: 'Add',
    subtype: '',
    from_location: vehicle?.location_code || '',
    to_location: '',
    fuel_level: '',
    notes: '',
    agreement_number: '',
    customer_id: '',
    start_location: '',
    return_location: '',
    start_time: '',
    end_time: '',
    odometer_out: '',
    odometer_in: '',
  });

  useEffect(() => {
    locationApi.getAll().then(r => setLocations(r.data)).catch(() => {});
    customerApi.getAll().then(r => setCustomers(r.data)).catch(() => {});
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        event_type: eventType,
        vin: vehicle.vin,
        employee_id: employee?.employee_id || employee?.id || null,
        location_code: form.location_code,
        odometer: form.odometer ? parseInt(form.odometer) : null,
      };

      switch (eventType) {
        case 'note':
          payload.content = form.content;
          break;
        case 'hold':
          payload.reason = form.reason;
          payload.action = form.action;
          break;
        case 'maintenance':
          payload.reason = form.reason;
          payload.action = form.action;
          payload.subtype = form.subtype;
          break;
        case 'movement':
          payload.from_location = form.from_location;
          payload.to_location = form.to_location;
          break;
        case 'condition_check':
          payload.fuel_level = form.fuel_level;
          payload.notes = form.notes;
          break;
        case 'rental':
          payload.agreement_number = form.agreement_number;
          payload.customer_id = form.customer_id ? parseInt(form.customer_id) : null;
          payload.start_location = form.start_location;
          payload.return_location = form.return_location;
          payload.start_time = form.start_time || null;
          payload.end_time = form.end_time || null;
          payload.odometer_out = form.odometer_out ? parseInt(form.odometer_out) : null;
          payload.odometer_in = form.odometer_in ? parseInt(form.odometer_in) : null;
          break;
        default:
          break;
      }

      await eventApi.create(payload);
      onSaved();
    } catch (err) {
      alert('Error saving event: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span>Add Event</span>
          <button onClick={onClose} style={{ background: 'none', fontSize: '1.2rem', color: '#5a5a7a' }}>
            &times;
          </button>
        </div>
        <div className="modal__body">
          <div className="form-group">
            <label>Event Type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="note">Note</option>
              <option value="hold">Hold</option>
              <option value="maintenance">Maintenance</option>
              <option value="movement">Movement</option>
              <option value="condition_check">Condition Check</option>
              <option value="rental">Rental</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <select value={form.location_code} onChange={(e) => handleChange('location_code', e.target.value)}>
                <option value="">Select...</option>
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
                onChange={(e) => handleChange('odometer', e.target.value)}
              />
            </div>
          </div>

          {eventType === 'note' && (
            <div className="form-group">
              <label>Content</label>
              <textarea
                rows={3}
                value={form.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter note..."
              />
            </div>
          )}

          {(eventType === 'hold' || eventType === 'maintenance') && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Reason</label>
                  <input
                    value={form.reason}
                    onChange={(e) => handleChange('reason', e.target.value)}
                    placeholder="e.g. Prev. Maintenance"
                  />
                </div>
                <div className="form-group">
                  <label>Action</label>
                  <select value={form.action} onChange={(e) => handleChange('action', e.target.value)}>
                    <option value="Add">Add</option>
                    <option value="Remove">Remove</option>
                  </select>
                </div>
              </div>
              {eventType === 'maintenance' && (
                <div className="form-group">
                  <label>Subtype</label>
                  <input
                    value={form.subtype}
                    onChange={(e) => handleChange('subtype', e.target.value)}
                    placeholder="e.g. Repair, Scheduled"
                  />
                </div>
              )}
            </>
          )}

          {eventType === 'movement' && (
            <div className="form-row">
              <div className="form-group">
                <label>From Location</label>
                <select value={form.from_location} onChange={(e) => handleChange('from_location', e.target.value)}>
                  <option value="">Select...</option>
                  {locations.map(l => (
                    <option key={l.location_code} value={l.location_code}>
                      {l.location_code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>To Location</label>
                <select value={form.to_location} onChange={(e) => handleChange('to_location', e.target.value)}>
                  <option value="">Select...</option>
                  {locations.map(l => (
                    <option key={l.location_code} value={l.location_code}>
                      {l.location_code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {eventType === 'condition_check' && (
            <div className="form-row">
              <div className="form-group">
                <label>Fuel Level</label>
                <select value={form.fuel_level} onChange={(e) => handleChange('fuel_level', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Full">Full</option>
                  <option value="3/4">3/4</option>
                  <option value="1/2">1/2</option>
                  <option value="1/4">1/4</option>
                  <option value="Empty">Empty</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
              </div>
            </div>
          )}

          {eventType === 'rental' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Agreement #</label>
                  <input
                    value={form.agreement_number}
                    onChange={(e) => handleChange('agreement_number', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Customer</label>
                  <select value={form.customer_id} onChange={(e) => handleChange('customer_id', e.target.value)}>
                    <option value="">Select...</option>
                    {customers.map(c => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Location</label>
                  <select value={form.start_location} onChange={(e) => handleChange('start_location', e.target.value)}>
                    <option value="">Select...</option>
                    {locations.map(l => (
                      <option key={l.location_code} value={l.location_code}>{l.location_code} - {l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Return Location</label>
                  <select value={form.return_location} onChange={(e) => handleChange('return_location', e.target.value)}>
                    <option value="">Select...</option>
                    {locations.map(l => (
                      <option key={l.location_code} value={l.location_code}>{l.location_code} - {l.name}</option>
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
              <div className="form-row">
                <div className="form-group">
                  <label>Odometer Out</label>
                  <input type="number" value={form.odometer_out} onChange={(e) => handleChange('odometer_out', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Odometer In</label>
                  <input type="number" value={form.odometer_in} onChange={(e) => handleChange('odometer_in', e.target.value)} />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddEventModal;
