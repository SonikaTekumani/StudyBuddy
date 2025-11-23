// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';

import ChatBot from './pages/ChatBot';
import DashboardPage from './pages/DashboardPage';
import PlannerNeatPlain from './pages/PlannerNeatPlain';
import TopNav from './components/TopNav';

import './index.css';
import './pages/dashboard.css';
import './pages/planner-neat.css';
import './components/topnav.css';

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <BrowserRouter>
      <TopNav />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/planner" element={<PlannerNeatPlain />} />
        <Route path="/chat" element={<ChatBot />} />
        {/* add more routes here as needed */}
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  </React.StrictMode>
);
