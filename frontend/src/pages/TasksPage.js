import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TASKS = [
  { label: 'CONDITION', path: '/condition-capture', requiresVehicle: true },
  { label: 'MOVEMENT', path: '/movement', requiresVehicle: true },
  { label: 'PHYSICAL INVENTORY', path: null },
  { label: 'READY LINE', path: null },
  { label: 'UNRENTABLE', path: null },
  { label: 'VIN PRINT', path: null },
  { label: 'VEHICLE HISTORY', path: '/vehicle-history', requiresVehicle: true },
  { label: 'VEHICLE INQUIRY', path: '/vehicle-inquiry', requiresVehicle: true },
];

function TasksPage({ vehicle, employee }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  const handleTask = (task) => {
    if (!task.path) {
      setToast('Feature coming soon');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    if (task.requiresVehicle && !vehicle) {
      setToast('Please search and select a vehicle first');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    navigate(`${task.path}/${vehicle.unit_number}`);
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div className="tabs" style={{ justifyContent: 'center', borderBottom: 'none', background: 'transparent' }}>
        <button className="tabs__tab tabs__tab--active">TASKS</button>
        <button className="tabs__tab">ANALYTICS</button>
      </div>
      <div className="tasks-page">
        <div className="tasks-list">
          {TASKS.map((task) => (
            <button key={task.label} className="task-item" onClick={() => handleTask(task)}>
              <span className="task-item__dot" />
              {task.label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="toast">
          <span style={{ fontSize: '1.1rem' }}>
            {toast.includes('coming soon') ? '\u2139\uFE0F' : '\u26A0\uFE0F'}
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default TasksPage;
