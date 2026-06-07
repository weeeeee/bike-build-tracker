import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, renameBuild, getCompletionPercent, getTotalPrice, COMPONENT_TYPES, COMPONENT_LABELS } from '../db/database';
import ComponentPanel from './ComponentPanel';
import BikeVisual from './BikeVisual';
import OrderTracker from './OrderTracker';
import ExtrasPanel from './ExtrasPanel';
import GeometryTab from './GeometryTab';

export default function BuildDetail({ buildId, onBack }) {
  const [tab, setTab] = useState('components');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Email PDF Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);

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

  const handleSendPdf = async (e) => {
    e.preventDefault();
    if (!customerEmail.trim()) return;

    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const payload = {
        customerEmail: customerEmail.trim(),
        buildName: build.name,
        totalPrice: total,
        components: components,
        extras: extras,
        customMessage: customMessage.trim()
      };

      const token = sessionStorage.getItem('mechanic_token');
      const res = await fetch('https://weeecycle.net/api/send-build-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send PDF specification.');
      }

      setEmailStatus({ type: 'success', text: 'PDF generated and sent successfully to ' + customerEmail.trim() + '!' });
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailStatus(null);
        setCustomerEmail('');
        setCustomMessage('');
      }, 3000);
    } catch (err) {
      setEmailStatus({ type: 'error', text: err.message });
    } finally {
      setSendingEmail(false);
    }
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>{build.name}</h2>
              {done && <span className="done-badge">Complete 🏆</span>}
              <button
                className="btn btn-sm"
                onClick={() => { setEditingName(true); setNameInput(build.name); }}
                title="Rename Build"
              >✏</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowEmailModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >✉️ Send PDF to Customer</button>
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
        <button
          className={`detail-tab${tab === 'geometry' ? ' active' : ''}`}
          onClick={() => setTab('geometry')}
        >
          Geometry
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
      ) : tab === 'orders' ? (
        <OrderTracker buildId={buildId} />
      ) : (
        <GeometryTab buildId={buildId} />
      )}

      {/* ── Email PDF Modal ── */}
      {showEmailModal && (
        <div className="modal-backdrop" onClick={() => !sendingEmail && setShowEmailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✉️ Send Build PDF Specification</h3>
              <button className="btn btn-sm" onClick={() => !sendingEmail && setShowEmailModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSendPdf}>
              <div className="modal-body">
                <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  Generate a beautiful PDF containing all component details, pricing, notes, and photos for <strong>{build.name}</strong> and email it directly to the customer.
                </p>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-color)' }}>Customer Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    disabled={sendingEmail}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', background: 'var(--card-bg)', color: 'var(--text-color)' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-color)' }}>Optional Message / Greeting</label>
                  <textarea
                    rows="3"
                    placeholder="e.g. Hi John, here is the initial specification and quote for your dream gravel build. Let me know what you think!"
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    disabled={sendingEmail}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '1rem', fontFamily: 'inherit', background: 'var(--card-bg)', color: 'var(--text-color)' }}
                  />
                </div>

                {emailStatus && (
                  <div className={`status-banner ${emailStatus.type}`} style={{ padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', background: emailStatus.type === 'success' ? '#d1fae5' : '#fee2e2', color: emailStatus.type === 'success' ? '#065f46' : '#991b1b', fontSize: '0.95rem', fontWeight: '500' }}>
                    {emailStatus.text}
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn" onClick={() => setShowEmailModal(false)} disabled={sendingEmail}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={sendingEmail || !customerEmail.trim()}>
                  {sendingEmail ? 'Generating & Sending...' : 'Send PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
