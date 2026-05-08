import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteBuild, renameBuild, getCompletionCount, getCompletionPercent, getTotalPrice, COMPONENT_TYPES } from '../db/database';

export default function BuildCard({ build, onSelect }) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(build.name);

  const components = useLiveQuery(
    () => db.components.where('buildId').equals(build.id).toArray(),
    [build.id]
  ) || [];

  const filled  = getCompletionCount(components);
  const pct     = getCompletionPercent(components);
  const total   = getTotalPrice(components);
  const done    = filled === COMPONENT_TYPES.length;

  const barColor = done
    ? '#059669'
    : pct > 50
    ? '#2563eb'
    : pct > 0
    ? '#d97706'
    : '#334155';

  const handleRename = async (e) => {
    e.stopPropagation();
    if (nameInput.trim()) {
      await renameBuild(build.id, nameInput.trim());
    }
    setEditing(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${build.name}"? This cannot be undone.`)) {
      await deleteBuild(build.id);
    }
  };

  return (
    <div className={`build-card${done ? ' complete' : ''}`} onClick={() => onSelect(build.id)}>
      <div className="build-card-top">
        {editing ? (
          <div className="build-rename" onClick={e => e.stopPropagation()}>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename(e)}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={handleRename}>Save</button>
            <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setEditing(false); }}>✕</button>
          </div>
        ) : (
          <h3 className="build-card-name">
            {build.name}
            {done && <span className="done-badge">Complete</span>}
          </h3>
        )}
        <div className="build-card-actions" onClick={e => e.stopPropagation()}>
          <button className="btn btn-sm" onClick={e => { e.stopPropagation(); setEditing(true); setNameInput(build.name); }}>✏</button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete}>🗑</button>
        </div>
      </div>

      <div className="build-card-meta">
        <span>{filled} / {COMPONENT_TYPES.length} components</span>
        <span>${total.toFixed(2)}</span>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="progress-label">{pct}% complete</div>

      <div className="build-card-date">
        Created {new Date(build.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
