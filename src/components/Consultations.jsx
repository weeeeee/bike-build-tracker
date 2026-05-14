import { useState, useEffect } from 'react';

const METHOD_LABELS = { text: 'Text', email: 'Email', phone: 'Phone' };

export default function Consultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [expanded, setExpanded]           = useState(null);

  useEffect(() => {
    fetch('/api/consultations')
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(data => { setConsultations(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const refresh = () => {
    setLoading(true);
    setError(null);
    fetch('/api/consultations')
      .then(r => r.json())
      .then(data => { setConsultations(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  if (loading) return <div className="consultations-empty">Loading...</div>;

  if (error) return (
    <div className="consultations-empty">
      <div className="empty-icon">⚠️</div>
      <h3>Could not load consultations</h3>
      <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Make sure the local server is running.</p>
      <button className="btn btn-primary" onClick={refresh}>Retry</button>
    </div>
  );

  return (
    <div>
      <div className="dash-header">
        <div>
          <h2 style={{ margin: 0 }}>Dream Build Consultations</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {consultations.length} request{consultations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn" onClick={refresh}>↻ Refresh</button>
      </div>

      {consultations.length === 0 ? (
        <div className="empty-state big">
          <div className="empty-icon">📋</div>
          <h3>No consultations yet</h3>
          <p>Dream Build requests submitted on the site will appear here.</p>
        </div>
      ) : (
        <div className="consult-list">
          {consultations.map(c => (
            <div
              key={c.id}
              className={`consult-card${expanded === c.id ? ' open' : ''}`}
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div className="consult-card-header">
                <div>
                  <span className="consult-name">{c.first_name} {c.last_name}</span>
                  <span className="consult-contact-badge">{METHOD_LABELS[c.contact_method] || c.contact_method}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="consult-email">{c.email}</div>
                  <div className="consult-date">{new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>

              {expanded === c.id && (
                <div className="consult-card-body">
                  {c.phone && (
                    <div className="consult-field">
                      <span className="consult-label">Phone</span>
                      <span>{c.phone}</span>
                    </div>
                  )}
                  <div className="consult-field">
                    <span className="consult-label">Description</span>
                    <p className="consult-description">{c.description}</p>
                  </div>
                  <div className="consult-field-row">
                    <a href={`mailto:${c.email}`} className="btn btn-primary btn-sm">Email {c.first_name}</a>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="btn btn-sm">Call {c.first_name}</a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
