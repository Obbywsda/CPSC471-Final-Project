import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

export const vehicleApi = {
  getAll: () => api.get('/vehicles'),
  search: (q) => api.get(`/vehicles/search?q=${encodeURIComponent(q)}`),
  getByVin: (vin) => api.get(`/vehicles/${vin}`),
  getRegistration: (vin) => api.get(`/vehicles/${vin}/registration`),
  update: (vin, data) => api.put(`/vehicles/${vin}`, data),
};

export const eventApi = {
  getByVehicle: (vin) => api.get(`/events/vehicle/${vin}`),
  create: (data) => api.post('/events', data),
};

export const conditionApi = {
  getById: (eventId) => api.get(`/conditions/${eventId}`),
  getDamages: (vin) => api.get(`/conditions/damages/${vin}`),
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
