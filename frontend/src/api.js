// minimal api.js
import axios from 'axios';
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const client = axios.create({ baseURL: API_BASE });

export const getUserMe = () => client.get('/user/me').then(r => r.data);
export const getPlanner = () => client.get('/planner').then(r => r.data);
export const getProgressSummary = () => client.get('/progress/summary').then(r => r.data);
export const getNotifications = (limit=10) => client.get(`/notifications?limit=${limit}`).then(r => r.data);

export const generatePlanner = (payload) => client.post('/planner/generate', payload).then(r => r.data);
export const updatePlan = (planId, payload) => client.put(`/planner/${planId}`, payload).then(r => r.data);
export const startSession = (payload) => client.post('/session/start', payload).then(r => r.data);
export const stopSession = (payload) => client.post('/session/stop', payload).then(r => r.data);
