import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import BuildDetail from './components/BuildDetail';
import CustomersCMS from './components/CustomersCMS';
import ServiceBoard from './components/ServiceBoard';
import InvoicesCMS from './components/InvoicesCMS';
import SettingsCMS from './components/SettingsCMS';
import { syncWorkshopData } from './db/database';

export default function App() {
  const token = sessionStorage.getItem('mechanic_token');
  if (!token) {
    window.location.href = 'https://weeecycle.net/mechanic-login.html';
    return null;
  }

  useEffect(() => {
    syncWorkshopData();
  }, []);

  const [view, setView] = useState('dashboard'); // 'dashboard', 'build', 'customers', 'service-board', 'invoices', 'settings'
  const [buildId, setBuildId] = useState(null);

  const openBuild = (id) => {
    setBuildId(id);
    setView('build');
  };

  const goBack = () => {
    setView('dashboard');
    setBuildId(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand" onClick={goBack} style={{ cursor: 'pointer' }}>
          <span className="brand-icon">🚲</span>
          <span className="brand-name">Shop Mechanic Portal</span>
        </div>
        <nav className="header-nav" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {view === 'build' ? (
            <button className="btn back-nav" onClick={goBack}>← All Builds</button>
          ) : (
            <>
              <button
                className={`btn nav-tab${view === 'dashboard' ? ' nav-tab-active' : ''}`}
                onClick={() => { setView('dashboard'); setBuildId(null); }}
              >🚲 Bike Builds</button>
              <button
                className={`btn nav-tab${view === 'customers' ? ' nav-tab-active' : ''}`}
                onClick={() => { setView('customers'); setBuildId(null); }}
              >👥 Customers CMS</button>
              <button
                className={`btn nav-tab${view === 'service-board' ? ' nav-tab-active' : ''}`}
                onClick={() => { setView('service-board'); setBuildId(null); }}
              >📋 Service Board</button>
              <button
                className={`btn nav-tab${view === 'invoices' ? ' nav-tab-active' : ''}`}
                onClick={() => { setView('invoices'); setBuildId(null); }}
              >📄 Quotes & Invoices</button>
              <button
                className={`btn nav-tab${view === 'settings' ? ' nav-tab-active' : ''}`}
                onClick={() => { setView('settings'); setBuildId(null); }}
              >⚙️ Settings</button>
            </>
          )}
        </nav>
      </header>

      <main className="app-main">
        {view === 'dashboard' && (
          <Dashboard onSelectBuild={openBuild} />
        )}
        {view === 'build' && buildId && (
          <BuildDetail buildId={buildId} onBack={goBack} />
        )}
        {view === 'customers' && (
          <CustomersCMS onNavigateToBoard={() => setView('service-board')} />
        )}
        {view === 'service-board' && (
          <ServiceBoard />
        )}
        {view === 'invoices' && (
          <InvoicesCMS />
        )}
        {view === 'settings' && (
          <SettingsCMS />
        )}
      </main>

      <footer className="app-footer">
        Shop Mechanic Portal — all data securely encrypted & stored locally in your browser
      </footer>
    </div>
  );
}
