import { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import BuildDetail from './components/BuildDetail';
import Consultations from './components/Consultations';

export default function App() {
  const [view, setView] = useState('dashboard');
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
          <span className="brand-name">BikeBuild Tracker</span>
        </div>
        <nav className="header-nav">
          {view === 'build' ? (
            <button className="btn back-nav" onClick={goBack}>← All Builds</button>
          ) : (
            <>
              <button
                className={`btn nav-tab${view === 'dashboard' ? ' nav-tab-active' : ''}`}
                onClick={goBack}
              >Builds</button>
              <button
                className={`btn nav-tab${view === 'consultations' ? ' nav-tab-active' : ''}`}
                onClick={() => setView('consultations')}
              >Consultations</button>
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
        {view === 'consultations' && (
          <Consultations />
        )}
      </main>

      <footer className="app-footer">
        BikeBuild Tracker — all data stored locally in your browser
      </footer>
    </div>
  );
}
