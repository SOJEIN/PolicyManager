import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getPolizas = () => api.get('/policies');
export const getPoliza = (id) => api.get(`/policies/${id}`);
export const getGestiones = (id) => api.get(`/policies/${id}/interactions`);
export const registrarGestion = (id, data) => api.post(`/policies/${id}/interactions`, data);
export const renovarPoliza = (id, data) => api.post(`/policies/${id}/renew`, data);
