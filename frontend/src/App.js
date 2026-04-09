import React, { useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import TasksPage from './pages/TasksPage';
import VehicleHistoryPage from './pages/VehicleHistoryPage';
import VehicleInquiryPage from './pages/VehicleInquiryPage';
import ConditionPage from './pages/ConditionPage';
import ConditionCapturePage from './pages/ConditionCapturePage';
import MovementPage from './pages/MovementPage';

const EMPLOYEE = { employee_id: 'E22DD7', name: 'Yasir Hussain', location: 'YYCT01' };

function App() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleVehicleSelect = useCallback((vehicle) => {
    setSelectedVehicle(vehicle);
  }, []);

  const isTasksPage = location.pathname === '/';

  return (
    <div className="app-layout">
      <Header
        employee={EMPLOYEE}
        vehicle={selectedVehicle}
        onVehicleSelect={handleVehicleSelect}
        isTasksPage={isTasksPage}
      />
      <main className="main-content">
        <Routes>
          <Route path="/" element={
            <TasksPage vehicle={selectedVehicle} employee={EMPLOYEE} />
          } />
          <Route path="/vehicle-history/:unitOrVin" element={
            <VehicleHistoryPage
              vehicle={selectedVehicle}
              onVehicleLoad={handleVehicleSelect}
              employee={EMPLOYEE}
            />
          } />
          <Route path="/vehicle-inquiry/:unitOrVin" element={
            <VehicleInquiryPage
              vehicle={selectedVehicle}
              onVehicleLoad={handleVehicleSelect}
            />
          } />
          <Route path="/condition/:unitOrVin" element={
            <ConditionPage
              vehicle={selectedVehicle}
              onVehicleLoad={handleVehicleSelect}
            />
          } />
          <Route path="/condition-capture/:unitOrVin" element={
            <ConditionCapturePage
              vehicle={selectedVehicle}
              onVehicleLoad={handleVehicleSelect}
              employee={EMPLOYEE}
            />
          } />
          <Route path="/movement/:unitOrVin" element={
            <MovementPage
              vehicle={selectedVehicle}
              onVehicleLoad={handleVehicleSelect}
              employee={EMPLOYEE}
            />
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
