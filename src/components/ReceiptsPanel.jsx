import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addReceipt, updateReceipt, deleteReceipt, openReceiptFile } from '../db/database';

const CATEGORIES = ['Parts', 'Tools & Equipment', 'Shop Supplies', 'Shipping', 'Other'];
const SHOP_ITEM_CATEGORIES = ['Tools & Equipment', 'Shop Supplies'];

// "Workshop" purchases are the ones with no customer attached (in-house stock, tools, materials).
const VIEWS = [
  { key: 'all', label: 'All purchases', test: () => true },
  { key: 'workshop', label: 'Workshop expenses', test: r => !r.customerId },
  { key: 'parts', label: 'Workshop parts stock', test: r => !r.customerId && r.category === 'Parts' },
  { key: 'tools', label: 'Workshop tools & materials', test: r => !r.customerId && SHOP_ITEM_CATEGORIES.includes(r.category) },
  { key: 'customer', label: 'Customer jobs', test: r => !!r.customerId },
];
const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIM = 1800;
const THUMB_DIM = 180;

const todayLocal = () => new Date().toLocaleDateString('en-CA');
const money = n => `$${(parseFloat(n) || 0).toFixed(2)}`;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image. Try a JPG, PNG or PDF.")); };
    img.src = url;
  });
}

function scaledJpeg(img, maxDim, quality) {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// Photos are shrunk before upload so a phone picture is a few hundred KB, not several MB.
async function prepareFile(file) {
  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) throw new Error('PDF is too large (4 MB max).');
    return { fileName: file.name, fileData: await readAsDataUrl(file), thumb: null };
  }
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo/image or a PDF.');
  const img = await loadImage(file);
  return {
    fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg',
    fileData: scaledJpeg(img, MAX_IMAGE_DIM, 0.82),
    thumb: scaledJpeg(img, THUMB_DIM, 0.7),
  };
}

const emptyForm = () => ({ date: todayLocal(), vendor: '', amount: '', category: 'Parts', customerId: '', description: '' });

export default function ReceiptsPanel({ customers }) {
  const receiptRows = useLiveQuery(() => db.receipts.toArray());
  const receipts = useMemo(() => receiptRows || [], [receiptRows]);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const customerMap = useMemo(
    () => Object.fromEntries(customers.map(c => [c.id, `${c.firstName} ${c.lastName}`.trim()])),
    [customers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inView = VIEWS.find(v => v.key === viewFilter).test;
    return receipts
      .filter(inView)
      .filter(r => categoryFilter === 'all' || r.category === categoryFilter)
      .filter(r => customerFilter === 'all' || (customerFilter === 'general' ? !r.customerId : String(r.customerId) === customerFilter))
      .filter(r => !q || `${r.vendor} ${r.description} ${r.fileName} ${customerMap[r.customerId] || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
  }, [receipts, search, viewFilter, categoryFilter, customerFilter, customerMap]);

  const viewStats = useMemo(() => VIEWS.map(v => {
    const rows = receipts.filter(v.test);
    return { ...v, count: rows.length, total: rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0) };
  }), [receipts]);

  const total = filtered.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openAdd = () => {
    setEditId(null); setForm(emptyForm()); setFile(null); setError(''); setShowModal(true);
  };

  const openEdit = r => {
    setEditId(r.id);
    setForm({ date: r.date || todayLocal(), vendor: r.vendor || '', amount: String(r.amount ?? ''), category: r.category || 'Other', customerId: r.customerId ? String(r.customerId) : '', description: r.description || '' });
    setFile(null); setError(''); setShowModal(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setError('');
    if (!editId && !file) { setError('Please attach the receipt (photo or PDF).'); return; }
    setSaving(true);
    try {
      const fields = { ...form, customerId: form.customerId ? parseInt(form.customerId) : null, amount: parseFloat(form.amount) || 0 };
      if (editId) {
        await updateReceipt(editId, fields);
      } else {
        await addReceipt({ ...fields, ...(await prepareFile(file)) });
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Could not save the receipt.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async r => {
    if (!window.confirm(`Delete the receipt from ${r.vendor || 'this vendor'} (${money(r.amount)})? The attached file will be removed too.`)) return;
    try { await deleteReceipt(r.id); } catch (err) { alert(err.message); }
  };

  const handleView = async r => {
    try { await openReceiptFile(r.id); } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>🛠️ Workshop Expenses</h3>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            In-house purchases (parts stock, tools, materials) and customer job purchases, each with its receipt attached.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Receipt</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {viewStats.map(v => (
          <button
            key={v.key} type="button"
            className={`btn nav-tab${viewFilter === v.key ? ' nav-tab-active' : ''}`}
            onClick={() => setViewFilter(v.key)}
            title={`${v.count} receipt${v.count === 1 ? '' : 's'} · ${money(v.total)}`}
          >
            {v.label} <span style={{ opacity: 0.75 }}>({v.count} · {money(v.total)})</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem', background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <input
          type="text" placeholder="🔍 Search vendor, notes, customer..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '0.5rem 1rem', minWidth: '240px', flex: '1 1 240px' }}
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: 'auto', padding: '0.4rem 1.5rem 0.4rem 0.6rem' }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} style={{ width: 'auto', padding: '0.4rem 1.5rem 0.4rem 0.6rem' }}>
          <option value="all">All Customers</option>
          <option value="general">Workshop (no customer)</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {filtered.length} receipt{filtered.length === 1 ? '' : 's'} · <strong style={{ color: 'var(--text-main)' }}>{money(total)}</strong>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state big">
          <div className="empty-icon">🧾</div>
          <h3>{receipts.length === 0 ? 'No receipts yet' : 'No receipts match your filters'}</h3>
          <p>{receipts.length === 0 ? 'Add your first receipt to start tracking purchases.' : 'Try adjusting the search or filters.'}</p>
          {receipts.length === 0 && <button className="btn btn-primary" onClick={openAdd}>+ Add Receipt</button>}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Receipt</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Vendor</th>
                <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                  <td style={{ padding: '0.6rem 1rem' }}>
                    <button
                      type="button" onClick={() => handleView(r)} title={`Open ${r.fileName}`}
                      style={{ width: '56px', height: '56px', padding: 0, border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-dark)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}
                    >
                      {r.thumb ? <img src={r.thumb} alt={r.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📄'}
                    </button>
                  </td>
                  <td style={{ padding: '0.6rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.date}</td>
                  <td style={{ padding: '0.6rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{r.vendor || '—'}</div>
                    {r.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.description}</div>}
                  </td>
                  <td style={{ padding: '0.6rem 1rem' }}><span className="status-badge status-ordered">{r.category}</span></td>
                  <td style={{ padding: '0.6rem 1rem', color: r.customerId ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {r.customerId ? (customerMap[r.customerId] || 'Unknown customer') : 'Workshop'}
                  </td>
                  <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>{money(r.amount)}</td>
                  <td style={{ padding: '0.6rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn btn-sm" onClick={() => handleView(r)} title="Open the receipt file">👁️ View</button>
                      <button className="btn btn-sm btn-icon" onClick={() => openEdit(r)} title="Edit details">✏️</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h3>{editId ? 'Edit Receipt' : 'Add Receipt'}</h3>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)} disabled={saving} style={{ background: 'none', border: 'none', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {!editId && (
                  <div className="input-group">
                    <label>Receipt file * (photo or PDF)</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => { setFile(e.target.files[0] || null); setError(''); }} />
                    {file && <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{file.name} · {(file.size / 1024).toFixed(0)} KB</div>}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Date *</label>
                    <input type="date" value={form.date} onChange={e => setField('date', e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label>Amount ($) *</label>
                    <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label>Vendor / Store *</label>
                    <input type="text" value={form.vendor} onChange={e => setField('vendor', e.target.value)} placeholder="e.g. Jenson USA" required />
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setField('category', e.target.value)}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>Customer (optional)</label>
                  <select value={form.customerId} onChange={e => setField('customerId', e.target.value)}>
                    <option value="">Workshop expense (no customer)</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? ` (${c.phone})` : ''}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Notes</label>
                  <input type="text" value={form.description} onChange={e => setField('description', e.target.value)} placeholder="What was purchased, order #, etc." />
                </div>
                {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editId ? 'Save Changes' : 'Save Receipt')}</button>
                <button type="button" className="btn" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
