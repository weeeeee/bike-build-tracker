import { Fragment, useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, fetchWorkOrderTemplates, addWorkOrder, updateWorkOrder, deleteWorkOrder, openWorkOrderPdf, emailWorkOrder } from '../db/database';

const STATUS_COLS = [
  { key: 'pass', label: 'Pass', color: '#16a34a' },
  { key: 'adjusted', label: 'Adjusted', color: '#2563eb' },
  { key: 'recommend', label: 'Recommend', color: '#ea580c' },
];
const LAST_TECH_KEY = 'wo_last_tech';
const todayLocal = () => new Date().toLocaleDateString('en-CA');
const formatDate = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? `${m[2]}/${m[3]}/${m[1]}` : (v || '—'); };

const readLastTech = () => { try { return localStorage.getItem(LAST_TECH_KEY) || ''; } catch { return ''; } };
const saveLastTech = v => { try { if (v) localStorage.setItem(LAST_TECH_KEY, v); } catch { /* storage blocked: not important */ } };

function blankForm(tpl) {
  const header = {};
  tpl.headerFields.forEach(f => { header[f.key] = ''; });
  header.date = todayLocal();
  header.tech = readLastTech();
  const items = {};
  tpl.sections.forEach(s => s.items.forEach(it => { items[it.id] = { pass: false, adjusted: false, recommend: false, notes: '' }; }));
  return { id: null, edition: tpl.edition, customerId: '', header, items, remarks: '', signature: '', dateCompleted: '' };
}

function formFromOrder(order, tpl) {
  const base = blankForm(tpl);
  return {
    ...base,
    id: order.id,
    customerId: order.customerId ? String(order.customerId) : '',
    header: { ...base.header, ...order.data.header },
    items: { ...base.items, ...order.data.items },
    remarks: order.data.remarks || '',
    signature: order.data.signature || '',
    dateCompleted: order.data.dateCompleted || '',
  };
}

const markedCount = order => Object.values(order.data?.items || {}).filter(a => a.pass || a.adjusted || a.recommend).length;
const totalItems = tpl => tpl.sections.reduce((n, s) => n + s.items.length, 0);

export default function WorkOrdersCMS() {
  const orderRows = useLiveQuery(() => db.workOrders.toArray());
  const orders = useMemo(() => orderRows || [], [orderRows]);
  const customerRows = useLiveQuery(() => db.customers.toArray());
  const customers = useMemo(() => customerRows || [], [customerRows]);

  const [templates, setTemplates] = useState(null);
  const [templatesError, setTemplatesError] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(null); // the work order being edited, or null
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const initialJson = useRef('');

  const [emailFor, setEmailFor] = useState(null); // { id, edition, bike }
  const [emailTo, setEmailTo] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCopy, setEmailCopy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailStatus, setEmailStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    let cancelled = false;
    fetchWorkOrderTemplates()
      .then(t => { if (!cancelled) setTemplates(t); })
      .catch(err => { if (!cancelled) setTemplatesError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const customerById = useMemo(() => Object.fromEntries(customers.map(c => [c.id, c])), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter(o => !q || `${o.data.header.customer} ${o.data.header.bike} ${o.data.header.woTag} ${o.data.header.serial}`.toLowerCase().includes(q))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '') || b.id - a.id);
  }, [orders, search]);

  const tpl = form && templates ? templates[form.edition] : null;

  const openNew = edition => {
    const next = blankForm(templates[edition]);
    initialJson.current = JSON.stringify(next);
    setNotice({ type: '', text: '' });
    setForm(next);
  };

  const openEdit = order => {
    const next = formFromOrder(order, templates[order.edition]);
    initialJson.current = JSON.stringify(next);
    setNotice({ type: '', text: '' });
    setForm(next);
  };

  const closeEditor = () => {
    const hasUnsavedChanges = JSON.stringify(form) !== initialJson.current;
    if (hasUnsavedChanges && !window.confirm('Close without saving your changes?')) return;
    setForm(null);
  };

  const setHeader = (key, value) => setForm(f => ({ ...f, header: { ...f.header, [key]: value } }));
  const setItem = (id, patch) => setForm(f => ({ ...f, items: { ...f.items, [id]: { ...f.items[id], ...patch } } }));

  const pickCustomer = e => {
    const id = e.target.value;
    const c = customerById[id];
    setForm(f => ({
      ...f,
      customerId: id,
      header: { ...f.header, customer: c ? `${c.firstName} ${c.lastName}`.trim() + (c.company ? ` (${c.company})` : '') : f.header.customer },
    }));
  };

  const persist = async () => {
    const payload = {
      customerId: form.customerId ? parseInt(form.customerId) : null,
      data: { header: form.header, items: form.items, remarks: form.remarks, signature: form.signature, dateCompleted: form.dateCompleted },
    };
    const saved = form.id ? await updateWorkOrder(form.id, payload) : await addWorkOrder({ edition: form.edition, ...payload });
    saveLastTech(form.header.tech);
    const next = { ...form, id: saved.id };
    initialJson.current = JSON.stringify(next);
    setForm(next);
    return saved;
  };

  const handleSave = async () => {
    setSaving(true); setNotice({ type: '', text: '' });
    try { await persist(); setForm(null); } catch (err) { setNotice({ type: 'error', text: err.message }); } finally { setSaving(false); }
  };

  // The tab is opened straight from the click, before the save, so the browser doesn't block it as a pop-up.
  const handleSavePrint = async () => {
    const tab = window.open('', '_blank');
    setSaving(true); setNotice({ type: '', text: '' });
    try {
      const saved = await persist();
      await openWorkOrderPdf(saved.id, tab);
      setNotice({ type: 'success', text: 'Saved. The PDF opened in a new tab: use its print button, or save it.' });
    } catch (err) {
      if (tab) tab.close();
      setNotice({ type: 'error', text: err.message });
    } finally { setSaving(false); }
  };

  const startEmail = (order) => {
    const c = customerById[order.customerId];
    setEmailFor({ id: order.id, edition: order.edition, bike: order.data.header.bike });
    setEmailTo((c && c.email) || order.lastEmailedTo || '');
    setEmailMessage(''); setEmailCopy(false); setEmailStatus({ type: '', text: '' });
  };

  const handleSaveEmail = async () => {
    setSaving(true); setNotice({ type: '', text: '' });
    try {
      const saved = await persist();
      startEmail(saved);
    } catch (err) { setNotice({ type: 'error', text: err.message }); } finally { setSaving(false); }
  };

  const sendEmail = async e => {
    e.preventDefault();
    setEmailBusy(true); setEmailStatus({ type: '', text: '' });
    try {
      await emailWorkOrder(emailFor.id, { to: emailTo.trim(), message: emailMessage.trim(), copyMe: emailCopy });
      setEmailStatus({ type: 'success', text: `Sent to ${emailTo.trim()}.` });
    } catch (err) {
      setEmailStatus({ type: 'error', text: err.message });
    } finally { setEmailBusy(false); }
  };

  const handlePrint = async order => {
    try { await openWorkOrderPdf(order.id); } catch (err) { alert(err.message); }
  };

  const handleDelete = async order => {
    if (!window.confirm(`Delete the work order for ${order.data.header.customer || 'this customer'}? This can't be undone.`)) return;
    try { await deleteWorkOrder(order.id); } catch (err) { alert(err.message); }
  };

  const noticeBox = n => n.text && (
    <div style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', fontSize: '0.9rem', marginTop: '0.75rem', background: n.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: n.type === 'error' ? 'var(--danger)' : 'var(--accent)', border: `1px solid ${n.type === 'error' ? 'var(--danger)' : 'var(--accent)'}` }}>
      {n.text}
    </div>
  );

  return (
    <div className="cms-container">
      <div className="dash-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Work Orders & Inspection Checklists</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Fill in the tune-up & overhaul checklist, then print it or email it to the customer as a PDF.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text" className="search-input" placeholder="🔍 Search customer, bike, WO #..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.5rem 1rem', minWidth: '220px' }}
          />
          <button className="btn btn-primary" disabled={!templates} onClick={() => openNew('rim')}>+ New: Rim Brake</button>
          <button className="btn btn-primary" disabled={!templates} onClick={() => openNew('disc')}>+ New: Disc Brake</button>
        </div>
      </div>

      {templatesError && noticeBox({ type: 'error', text: `Couldn't load the checklist forms: ${templatesError}` })}

      {filtered.length === 0 ? (
        <div className="empty-state big" style={{ marginTop: '1.5rem' }}>
          <div className="empty-icon">📝</div>
          <h3>{orders.length === 0 ? 'No work orders yet' : 'No work orders match your search'}</h3>
          <p>{orders.length === 0 ? 'Start a rim brake or disc brake checklist to inspect a bike and give the customer a PDF copy.' : 'Try a different search.'}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>WO / Tag</th>
                <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem' }}>Bike</th>
                <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Checked</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const total = templates ? totalItems(templates[o.edition]) : 0;
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{o.data.header.woTag || `#${o.id}`}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{o.data.header.customer || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{o.data.header.bike || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`status-badge ${o.edition === 'rim' ? 'status-ordered' : 'status-received'}`}>{o.edition === 'rim' ? 'Rim brake' : 'Disc brake'}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(o.data.header.date)}</td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      {markedCount(o)}{total ? ` of ${total}` : ''}
                      {o.lastEmailedTo && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} title={o.lastEmailedAt}>✉ sent to {o.lastEmailedTo}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="btn btn-sm" onClick={() => openEdit(o)} title="Open and edit the checklist">✏️ Edit</button>
                        <button className="btn btn-sm" onClick={() => handlePrint(o)} title="Open the PDF to print or save">🖨️ Print</button>
                        <button className="btn btn-sm" onClick={() => startEmail(o)} title="Email the PDF">✉️ Email</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(o)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Checklist editor ── */}
      {form && tpl && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '1000px' }}>
            <div className="modal-header">
              <h3>{form.id ? 'Edit Work Order' : 'New Work Order'} — {tpl.editionLabel} Edition</h3>
              <button className="btn btn-sm btn-icon" onClick={closeEditor} disabled={saving} style={{ background: 'none', border: 'none', fontSize: '1.2rem' }} aria-label="Close">✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              <div className="input-group">
                <label htmlFor="wo-customer">Customer from directory (optional)</label>
                <select id="wo-customer" value={form.customerId} onChange={pickCustomer}>
                  <option value="">— Walk-in / not in the directory (type the name below) —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.company ? ` · ${c.company}` : ''}{c.phone ? ` (${c.phone})` : ''}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem 1rem' }}>
                {tpl.headerFields.map(f => (
                  <div className="input-group" key={f.key} style={{ marginBottom: 0 }}>
                    <label htmlFor={`wo-h-${f.key}`} style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>{f.label}</label>
                    <input
                      id={`wo-h-${f.key}`} type={f.type === 'date' ? 'date' : 'text'} maxLength={120}
                      value={form.header[f.key] || ''} onChange={e => setHeader(f.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <p style={{ margin: '1rem 0', padding: '0.6rem 0.9rem', borderLeft: '3px solid var(--text-muted)', background: 'rgba(148,163,184,0.1)', fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                <strong>Scope Exclusion Notice:</strong> {tpl.notice}
              </p>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                  <thead>
                    <tr style={{ background: '#0f1b2d', color: '#fff', fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>Inspection item & service tasks</th>
                      {STATUS_COLS.map(c => <th key={c.key} style={{ padding: '0.6rem 0.4rem', width: '84px', textAlign: 'center' }}>{c.label}</th>)}
                      <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', width: '210px' }}>Mechanic notes / measurements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tpl.sections.map(sec => (
                      <Fragment key={sec.title}>
                        <tr>
                          <td colSpan={5} style={{ padding: '0.45rem 0.8rem', background: 'rgba(148,163,184,0.16)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.03em' }}>{sec.title}</td>
                        </tr>
                        {sec.items.map(it => (
                          <tr key={it.id} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.6rem 0.8rem' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{it.title}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.35 }}>{it.desc}</div>
                            </td>
                            {STATUS_COLS.map(c => (
                              <td key={c.key} style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox" checked={!!form.items[it.id][c.key]} aria-label={`${it.title}: ${c.label}`}
                                  onChange={e => setItem(it.id, { [c.key]: e.target.checked })}
                                  style={{ width: '20px', height: '20px', accentColor: c.color, cursor: 'pointer' }}
                                />
                              </td>
                            ))}
                            <td style={{ padding: '0.4rem 0.6rem' }}>
                              <input
                                type="text" maxLength={300} aria-label={`${it.title}: notes`} value={form.items[it.id].notes}
                                onChange={e => setItem(it.id, { notes: e.target.value })} style={{ width: '100%', padding: '0.4rem 0.5rem' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="wo-remarks">Additional recommendations / customer remarks</label>
                <textarea id="wo-remarks" rows="4" maxLength={2000} value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="wo-signature">Mechanic signature (type your name)</label>
                  <input id="wo-signature" type="text" maxLength={80} value={form.signature} onChange={e => setForm(f => ({ ...f, signature: e.target.value }))} style={{ fontFamily: "'Times New Roman', serif", fontStyle: 'italic', fontSize: '1.1rem' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="wo-date-completed">Date completed</label>
                  <input id="wo-date-completed" type="date" value={form.dateCompleted} onChange={e => setForm(f => ({ ...f, dateCompleted: e.target.value }))} />
                </div>
              </div>
              {noticeBox(notice)}
            </div>
            <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn" onClick={handleSavePrint} disabled={saving}>🖨️ Save & Print PDF</button>
              <button type="button" className="btn" onClick={handleSaveEmail} disabled={saving}>✉️ Save & Email PDF…</button>
              <button type="button" className="btn" onClick={closeEditor} disabled={saving}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email dialog ── */}
      {emailFor && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Email the {emailFor.edition === 'rim' ? 'Rim Brake' : 'Disc Brake'} Checklist</h3>
              <button className="btn btn-sm btn-icon" onClick={() => setEmailFor(null)} disabled={emailBusy} style={{ background: 'none', border: 'none', fontSize: '1.2rem' }} aria-label="Close email">✕</button>
            </div>
            <form onSubmit={sendEmail}>
              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="wo-email-to">Send the PDF to *</label>
                  <input id="wo-email-to" type="email" required value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="customer@example.com" autoFocus />
                </div>
                <div className="input-group">
                  <label htmlFor="wo-email-message">Message (optional)</label>
                  <textarea id="wo-email-message" rows="3" maxLength={1000} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} placeholder="Add a short note to go with the PDF..." />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={emailCopy} onChange={e => setEmailCopy(e.target.checked)} style={{ width: 'auto', margin: 0 }} /> Send me a copy too
                </label>
                {noticeBox(emailStatus)}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={emailBusy}>{emailBusy ? 'Sending...' : 'Send PDF'}</button>
                <button type="button" className="btn" onClick={() => setEmailFor(null)} disabled={emailBusy}>{emailStatus.type === 'success' ? 'Done' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
