import axios from 'axios';


const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const client = axios.create({ baseURL: API_BASE });


export const getPlanner = () => client.get('/planner').then(r => r.data);
export const generatePlanner = (payload) => client.post('/planner/generate', payload).then(r => r.data);
export const updatePlan = (planId, payload) => client.put(`/planner/${planId}`, payload).then(r => r.data);
export const moveTask = (payload) => client.put('/planner/calendar/move', payload).then(r => r.data);
export const startSession = (payload) => client.post('/session/start', payload).then(r => r.data);
export const stopSession = (payload) => client.post('/session/stop', payload).then(r => r.data);
export const getUserMe = () => client.get('/user/me').then(res => res.data);
export const getNotifications = (limit=10) => client.get(`/notifications?limit=${limit}`).then(res => res.data);
export const getProgressSummary = () => client.get('/progress/summary').then(res => res.data);