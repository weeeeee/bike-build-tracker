import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateJobStage, deleteJob, updateJob } from '../db/database';

const STAGES = [
  'In the shop',
  'Inspection',
  'Approval',
  'Awaiting for parts',
  'Service',
  'Testing',
  'Waiting for pickup',
  'Complete'
];

const STAGE_COLORS = {
  'In the shop': '#6b7280',
  'Inspection': '#f59e0b',
  'Approval': '#3b82f6',
  'Awaiting for parts': '#ef4444',
  'Service': '#8b5cf6',
  'Testing': '#06b6d4',
  'Waiting for pickup': '#10b981',
  'Complete': '#14b8a6'
};

export default function ServiceBoard() {
  const [editJobId, setEditJobId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editCost, setEditCost] = useState('');
  const [search, setSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState(new Set());

  const jobs = useLiveQuery(() => db.jobs.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach(c => { map[c.id] = c; });
    return map;
  }, [customers]);

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter(job => {
      const cust = customerMap[job.customerId] || {};
      const fullName = `${cust.firstName || ''} ${cust.lastName || ''}`.toLowerCase();
      return (
        (job.title || '').toLowerCase().includes(term) ||
        fullName.includes(term) ||
        (cust.phone || '').includes(term) ||
        (job.bikeModel || '').toLowerCase().includes(term) ||
        (job.notes || '').toLowerCase().includes(term)
      );
    });
  }, [jobs, customerMap, search]);

  const toggleCard = (jobId) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleMove = async (jobId, currentStage, direction) => {
    const idx = STAGES.indexOf(currentStage);
    const newIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (newIdx >= 0 && newIdx < STAGES.length) {
      await updateJobStage(jobId, STAGES[newIdx]);
    }
  };

  const handleDelete = async (jobId, title) => {
    if (window.confirm(`Are you sure you want to remove the job "${title}"?`)) {
      await deleteJob(jobId);
    }
  };

  const openEditModal = (job) => {
    setEditJobId(job.id);
    setEditNotes(job.notes || '');
    setEditCost(job.estimatedCost || '');
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (editJobId) {
      await updateJob(editJobId, { notes: editNotes.trim(), estimatedCost: editCost.trim() });
      setEditJobId(null);
    }
  };

  const isSearching = search.trim().length > 0;

  return (
    <div className="board-container" style={{ paddingBottom: '2rem' }}>
      <div className="dash-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Service Board (Kanban Workflow)</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {jobs.length} active job{jobs.length !== 1 ? 's' : ''} across 8 workshop stages
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: '320px', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.95rem', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs, customers, bikes..."
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {isSearching && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', padding: '0.25rem' }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {isSearching && (
        <p style={{ margin: '-0.75rem 0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Showing {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} for "{search.trim()}"
        </p>
      )}

      <div className="kanban-wrapper" style={{ display: 'flex', gap: '1.25rem', overflowX: 'auto', paddingBottom: '1.5rem', minHeight: '65vh' }}>
        {STAGES.map(stage => {
          const stageJobs = filteredJobs.filter(j => j.stage === stage);
          const color = STAGE_COLORS[stage] || '#6b7280';

          return (
            <div key={stage} className="kanban-column" style={{ minWidth: '320px', width: '320px', background: 'var(--bg-surface)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid', borderColor: color }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                  {stage}
                </h3>
                <span style={{ background: 'var(--bg-card)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                  {stageJobs.length}
                </span>
              </div>

              {stageJobs.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', background: 'var(--bg-card)', borderRadius: '8px', border: '1px dashed var(--border-color)', margin: 'auto 0' }}>
                  {isSearching ? 'No matches' : 'No jobs in this stage'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {stageJobs.map(job => {
                    const cust = customerMap[job.customerId] || { firstName: 'Unknown', lastName: 'Customer', phone: '' };
                    const isExpanded = expandedCards.has(job.id);

                    return (
                      <div key={job.id} className="kanban-card" style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        {/* Card Header — always visible, click to toggle */}
                        <div
                          onClick={() => toggleCard(job.id)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', gap: '0.5rem', userSelect: 'none' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {job.title}
                            </h4>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              👤 {cust.firstName} {cust.lastName}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              className="btn-icon"
                              onClick={e => { e.stopPropagation(); openEditModal(job); }}
                              title="Edit Notes & Cost"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0.15rem' }}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-icon"
                              onClick={e => { e.stopPropagation(); handleDelete(job.id, job.title); }}
                              title="Delete Job"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0.15rem' }}
                            >
                              🗑️
                            </button>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                          </div>
                        </div>

                        {/* Expandable body */}
                        {isExpanded && (
                          <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              {cust.phone && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>📞 {cust.phone}</p>}
                              {job.bikeModel && <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.85rem' }}>🚲 {job.bikeModel}</p>}
                              {job.estimatedCost && <p style={{ margin: 0, color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>💰 Est. Cost: ${parseFloat(job.estimatedCost).toFixed(2)}</p>}
                              {job.notes && (
                                <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: 'var(--bg-surface)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                  {job.notes}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                              <button
                                className="btn btn-sm"
                                onClick={() => handleMove(job.id, job.stage, 'prev')}
                                disabled={STAGES.indexOf(job.stage) === 0}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', opacity: STAGES.indexOf(job.stage) === 0 ? 0.3 : 1 }}
                              >
                                ← Prev
                              </button>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stage {STAGES.indexOf(job.stage) + 1}/8</span>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleMove(job.id, job.stage, 'next')}
                                disabled={STAGES.indexOf(job.stage) === STAGES.length - 1}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', opacity: STAGES.indexOf(job.stage) === STAGES.length - 1 ? 0.3 : 1 }}
                              >
                                Next →
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Job Modal */}
      {editJobId && (
        <div className="modal-overlay" onClick={() => setEditJobId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Update Job Details</h3>
            <form onSubmit={handleSaveNotes}>
              <div className="input-group">
                <label>Estimated Cost ($)</label>
                <input type="number" step="0.01" value={editCost} onChange={e => setEditCost(e.target.value)} placeholder="150.00" autoFocus />
              </div>
              <div className="input-group">
                <label>Service Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows="4" placeholder="Update progress notes, unexpected parts required..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary">Save Details</button>
                <button type="button" className="btn" onClick={() => setEditJobId(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
