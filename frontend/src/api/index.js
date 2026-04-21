import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

const pathPart = (value) => encodeURIComponent(value);

export const vehicleApi = {
  getAll: () => api.get('/vehicles'),
  search: (q) => api.get(`/vehicles/search?q=${encodeURIComponent(q)}`),
  getByVin: (vin) => api.get(`/vehicles/${pathPart(vin)}`),
  getRegistration: (vin) => api.get(`/vehicles/${pathPart(vin)}/registration`),
  getHolds: (vin) => api.get(`/vehicles/${pathPart(vin)}/holds`),
  update: (vin, data) => api.put(`/vehicles/${pathPart(vin)}`, data),
  create: (data) => api.post('/vehicles', data),
  delete: (vin) => api.delete(`/vehicles/${pathPart(vin)}`),
};

export const eventApi = {
  getByVehicle: (vin) => api.get(`/events/vehicle/${pathPart(vin)}`),
  create: (data) => api.post('/events', data),
};

export const conditionApi = {
  getById: (eventId) => api.get(`/conditions/${eventId}`),
  getDamages: (vin) => api.get(`/conditions/damages/${pathPart(vin)}`),
  updateDamage: (eventId, bodyArea, data) => api.put(`/conditions/damages/${eventId}/${pathPart(bodyArea)}`, data),
  createDamage: (data) => api.post('/conditions/damages', data),
};


export const maintenanceApi = {
  getTasks: () => api.get('/maintenance/tasks'),
  getStats: () => api.get('/maintenance/stats'),
};

export const reservationApi = {
  getAll: () => api.get('/reservations'),
  getStats: () => api.get('/reservations/stats'),
  create: (data) => api.post('/reservations', data),
};

export const employeeApi = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
};

export const locationApi = {
  getAll: () => api.get('/locations'),
};

export const customerApi = {
  getAll: () => api.get('/customers'),
};

export default api;
