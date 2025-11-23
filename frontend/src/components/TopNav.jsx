// frontend/src/components/TopNav.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './topnav.css';

const LOGO = '/mnt/data/Screenshot 2025-11-23 161805.png';

export default function TopNav() {
  const loc = useLocation();
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <div className="topnav-left">
          <img src={LOGO} alt="logo" className="topnav-logo" />
          <div className="brand">
            <div className="brand-title">STAY FOCUSED</div>
            <div className="brand-sub">Exam Cram Dashboard</div>
          </div>
        </div>

        <nav className="topnav-links">
          <Link className={`nav-link ${loc.pathname === '/' || loc.pathname === '/dashboard' ? 'active' : ''}`} to="/dashboard">Dashboard</Link>
          <Link className={`nav-link ${loc.pathname === '/planner' ? 'active' : ''}`} to="/planner">Planner</Link>
          <Link className="nav-link" to="/chat">Study Buddy</Link>
        </nav>
      </div>
    </header>
  );
}
