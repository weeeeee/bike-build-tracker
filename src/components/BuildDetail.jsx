import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, renameBuild, getCompletionPercent, getTotalPrice, COMPONENT_TYPES, COMPONENT_LABELS } from '../db/database';
import ComponentPanel from './ComponentPanel';
import BikeVisual from './BikeVisual';
import OrderTracker from './OrderTracker';
import ExtrasPanel from './ExtrasPanel';

export default function BuildDetail({ buildId, onBack }) {
  const [tab, setTab] = useState('components');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const build = useLiveQuery(() => db.builds.get(buildId), [buildId]);
  const components = useLiveQuery(
    () => db.components.where('buildId').equals(buildId).toArray(),
    [buildId]
  ) || [];
  const extras = useLiveQuery(
    () => db.extras.where('buildId').equals(buildId).toArray(),
    [buildId]
  ) || [];

  if (!build) return <div className="loading">Loading…</div>;

  const pct   = getCompletionPercent(components);
  const total = getTotalPrice(components, extras);
  const done  = pct === 100;

  const handleRename = async (e) => {
    e.preventDefault();
    if (nameInput.trim()) await renameBuild(buildId, nameInput.trim());
    setEditingName(false);
  };

  // Sort components by COMPONENT_TYPES order
  const sortedComponents = COMPONENT_TYPES.map(type =>
    components.find(c => c.type === type)
  ).filter(Boolean);

  return (
    <div className="build-detail">
      {/* ── Header ── */}
      <div className="detail-header">
        <button className="btn back-btn" onClick={onBack}>← Back</button>
        <div className="detail-title">
          {editingName ? (
            <form onSubmit={handleRename} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                autoFocus
                style={{ fontSize: '1.3rem', fontWeight: '700' }}
              />
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
              <button type="button" className="btn btn-sm" onClick={() => setEditingName(false)}>✕</button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ margin: 0 }}>{build.name}</h2>
              {done && <span className="done-badge">Complete 🏆</span>}
              <button
                className="btn btn-sm"
                onClick={() => { setEditingName(true); setNameInput(build.name); }}
              >✏</button>
            </div>
          )}
        </div>
        <div className="detail-stats">
          <div className="stat-chip">
            <span className="stat-val">{pct}%</span>
            <span className="stat-lbl">complete</span>
          </div>
          <div className="stat-chip">
            <span className="stat-val">${total.toFixed(2)}</span>
            <span className="stat-lbl">total</span>
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="detail-progress">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: done ? '#059669' : pct > 50 ? '#2563eb' : '#d97706',
          }}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="detail-tabs">
        <button
          className={`detail-tab${tab === 'components' ? ' active' : ''}`}
          onClick={() => setTab('components')}
        >
          Components ({components.filter(c => c.name?.trim()).length}/{COMPONENT_TYPES.length})
        </button>
        <button
          className={`detail-tab${tab === 'orders' ? ' active' : ''}`}
          onClick={() => setTab('orders')}
        >
          Orders
        </button>
      </div>

      {/* ── Content ── */}
      {tab === 'components' ? (
        <div className="detail-layout">
          {/* Left: component panels + extras */}
          <div className="comp-list">
            {sortedComponents.map(comp => (
              <ComponentPanel
                key={comp.id}
                component={comp}
                label={COMPONENT_LABELS[comp.type] || comp.type}
              />
            ))}
            <ExtrasPanel buildId={buildId} />
          </div>

          {/* Right: sticky bike visual */}
          <div className="bike-visual-sidebar">
            <BikeVisual components={components} />
          </div>
        </div>
      ) : (
        <OrderTracker buildId={buildId} />
      )}
    </div>
  );
}
