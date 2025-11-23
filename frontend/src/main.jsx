// frontend/src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
//import PlannerPage from './pages/PlannerPage';
import PlannerNeatPlain from './pages/PlannerNeatPlain';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PlannerNeatPlain />
    </QueryClientProvider>
  </React.StrictMode>
);

//createRoot(document.getElementById('root')).render(
  //<React.StrictMode>
    //<QueryClientProvider client={queryClient}>
      //<PlannerPage />
    //</QueryClientProvider>
  //</React.StrictMode>
//);

