import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createBuild } from '../db/database';
import BuildCard from './BuildCard';

export default function Dashboard({ onSelectBuild }) {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName]     = useState('');
  const [newDesc, setNewDesc]     = useState('');

  const builds = useLiveQuery(() => db.builds.orderBy('createdAt').reverse().toArray()) || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id = await createBuild(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setShowModal(false);
    onSelectBuild(id);
  };

  return (
    <div>
      <div className="dash-header">
        <div>
          <h2 style={{ margin: 0 }}>My Builds</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {builds.length} build{builds.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Build
        </button>
      </div>

      {builds.length === 0 ? (
        <div className="empty-state big">
          <div className="empty-icon">🚲</div>
          <h3>No builds yet</h3>
          <p>Create your first build to start tracking components and orders.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Build
          </button>
        </div>
      ) : (
        <div className="build-grid">
          {builds.map(build => (
            <BuildCard key={build.id} build={build} onSelect={onSelectBuild} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>New Build</h3>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label>Build Name *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. XC Race Build 2025"
                  autoFocus
                  required
                />
              </div>
              <div className="input-group">
                <label>Description (optional)</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows="2"
                  placeholder="Frame type, intended use..."
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary">Create Build</button>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
