export function formatDate(value, options = {}) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', options);
}

export function formatDateTime(value, options = {}) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-US', options);
}

export function formatNumber(value, suffix = '') {
  if (value === null || value === undefined || value === '') return 'N/A';
  return `${Number(value).toLocaleString()}${suffix}`;
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  return Number(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

export function formatReservationPeriod(reservation) {
  const start = reservation.start_time ? formatDateTime(reservation.start_time, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Open';
  const end = reservation.end_time ? formatDateTime(reservation.end_time, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Open';
  return `${start} - ${end}`;
}

export function getVehicleStatusClass(status) {
  switch (status) {
    case 'Available':
      return 'badge--active';
    case 'Rented':
      return 'badge--in-transit';
    case 'On Hold':
      return 'badge--hold';
    case 'In Maintenance':
      return 'badge--maintenance';
    default:
      return 'badge--verified';
  }
}

export function getEventLabel(event) {
  switch (event.event_type) {
    case 'rental':
      return 'Rental Activity';
    case 'maintenance':
      return 'Maintenance';
    case 'condition_check':
      return 'Condition Check';
    case 'hold':
      return event.hold_action === 'Remove' ? 'Hold Removed' : 'Hold Applied';
    case 'movement':
      return 'Vehicle Movement';
    case 'note':
      return 'Note Added';
    default:
      return event.event_type;
  }
}

export function getEventSummary(event) {
  switch (event.event_type) {
    case 'hold':
      return event.hold_reason || 'Hold recorded';
    case 'note':
      return event.note_content || 'Note recorded';
    case 'maintenance':
      return [event.maint_reason, event.maint_subtype].filter(Boolean).join(' - ') || 'Maintenance recorded';
    case 'movement':
      return [event.from_location_name || event.from_location, event.to_location_name || event.to_location].filter(Boolean).join(' to ') || 'Vehicle moved';
    case 'condition_check':
      return event.cc_notes || `${event.damages?.length || 0} damage entries logged`;
    case 'rental':
      return event.customer_name || event.agreement_number || 'Rental recorded';
    default:
      return 'Event recorded';
  }
}
