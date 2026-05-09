import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addExtra, updateExtra, deleteExtra, COMPONENT_STATUSES } from '../db/database';
import ImageUpload from './ImageUpload';

const STATUS_BADGE = {
  planned:  'status-planned',
  ordered:  'status-ordered',
  received: 'status-received',
  installed:'status-installed',
};

const emptyForm = {
  name: '',
  category: '',
  quantity: '1',
  price: '',
  description: '',
  notes: '',
  sourceUrl: '',
  imageUrls: [],
  status: 'planned',
};

function ExtraRow({ extra }) {
  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState(toForm(extra));
  const [saving, setSaving] = useState(false);

  const subtotal = (parseFloat(extra.price) || 0) * (parseInt(extra.quantity) || 1);
  const images   = extra.imageUrls || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateExtra(extra.id, form);
    setSaving(false);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${extra.name}"?`)) await deleteExtra(extra.id);
  };

  return (
    <div className={`extra-row${open ? ' open' : ''}`}>
      <div className="extra-row-header" onClick={() => setOpen(o => !o)}>
        <div className="extra-row-left">
          <span className="comp-filled-dot on" />
          <span className="extra-name">{extra.name}</span>
          {extra.category && <span className="extra-category-tag">{extra.category}</span>}
          <span className="extra-qty-price">
            {parseInt(extra.quantity) > 1 && `×${extra.quantity} `}
            {extra.price && `$${subtotal.toFixed(2)}`}
          </span>
        </div>
        <div className="extra-row-right">
          <span className={`status-badge ${STATUS_BADGE[extra.status] || 'status-planned'}`}>
            {extra.status || 'planned'}
          </span>
          <button className="btn btn-sm btn-danger"
            onClick={e => { e.stopPropagation(); handleDelete(); }}>✕</button>
          <span className="comp-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <form className="comp-form" onSubmit={handleSave}>
          <div className="comp-form-grid">
            <div className="input-group">
              <label>Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required autoFocus />
            </div>
            <div className="input-group">
              <label>Category</label>
              <input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Spacer, Pedal, Tape…" />
            </div>
            <div className="input-group">
              <label>Quantity</label>
              <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Price each ($)</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder="0.00" />
            </div>
          </div>

          <div className="input-group">
            <label>Status</label>
            <div className="status-radio-group">
              {COMPONENT_STATUSES.map(s => (
                <label key={s} className={`status-radio${form.status === s ? ' selected' : ''} ${STATUS_BADGE[s]}`}>
                  <input type="radio" name="status" value={s} checked={form.status === s} onChange={handleChange} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows="2" placeholder="Size, spec, compatibility…" />
          </div>

          <div className="input-group">
            <label>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows="2" />
          </div>

          <div className="input-group">
            <label>Source Link</label>
            <input name="sourceUrl" type="url" value={form.sourceUrl} onChange={handleChange} placeholder="https://shop.com/product…" />
          </div>

          <div className="input-group">
            <label>Images</label>
            <ImageUpload
              values={form.imageUrls}
              onChange={urls => setForm(prev => ({ ...prev, imageUrls: urls }))}
            />
          </div>

          <div className="comp-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {!open && (images.length > 0 || extra.sourceUrl) && (
        <div className="comp-thumb">
          {images.length > 0 && (
            <div className="comp-thumb-grid">
              {images.map((url, i) => (
                <img key={i} src={url} alt={`${extra.name} ${i + 1}`} />
              ))}
            </div>
          )}
          {extra.sourceUrl && (
            <a href={extra.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="comp-source-link" onClick={e => e.stopPropagation()}>
              🔗 View source
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExtrasPanel({ buildId }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const extras = useLiveQuery(
    () => db.extras.where('buildId').equals(buildId).sortBy('createdAt'),
    [buildId]
  ) || [];

  const extrasTotal = extras.reduce(
    (sum, e) => sum + (parseFloat(e.price) || 0) * (parseInt(e.quantity) || 1), 0
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await addExtra(buildId, form);
    setSaving(false);
    setForm(emptyForm);
    setShowForm(false);
  };

  return (
    <div className="extras-panel">
      <div className="extras-header">
        <div>
          <h4 className="extras-title">Extras &amp; Accessories</h4>
          {extras.length > 0 && (
            <span className="extras-subtotal">
              {extras.length} item{extras.length !== 1 ? 's' : ''} · ${extrasTotal.toFixed(2)}
            </span>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ Add Extra'}
        </button>
      </div>

      {showForm && (
        <form className="comp-form extras-add-form" onSubmit={handleAdd}>
          <div className="comp-form-grid">
            <div className="input-group">
              <label>Name *</label>
              <input name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Pedals, Spacer kit, Bar tape…" autoFocus required />
            </div>
            <div className="input-group">
              <label>Category</label>
              <input name="category" value={form.category} onChange={handleChange}
                placeholder="e.g. Pedal, Spacer, Cable…" />
            </div>
            <div className="input-group">
              <label>Quantity</label>
              <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Price each ($)</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price}
                onChange={handleChange} placeholder="0.00" />
            </div>
          </div>
          <div className="input-group">
            <label>Status</label>
            <div className="status-radio-group">
              {COMPONENT_STATUSES.map(s => (
                <label key={s} className={`status-radio${form.status === s ? ' selected' : ''} ${STATUS_BADGE[s]}`}>
                  <input type="radio" name="status" value={s} checked={form.status === s} onChange={handleChange} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div className="comp-form-grid">
            <div className="input-group">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows="2"
                placeholder="Size, spec, compatibility…" />
            </div>
            <div className="input-group">
              <label>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows="2" />
            </div>
          </div>
          <div className="input-group">
            <label>Source Link</label>
            <input name="sourceUrl" type="url" value={form.sourceUrl} onChange={handleChange}
              placeholder="https://shop.com/product…" />
          </div>
          <div className="input-group">
            <label>Images</label>
            <ImageUpload
              values={form.imageUrls}
              onChange={urls => setForm(prev => ({ ...prev, imageUrls: urls }))}
            />
          </div>
          <div className="comp-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding…' : 'Add Extra'}
            </button>
            <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {extras.length === 0 && !showForm ? (
        <p className="extras-empty">No extras yet — add pedals, spacers, bar tape, cables, and anything else.</p>
      ) : (
        <div className="extras-list">
          {extras.map(extra => <ExtraRow key={extra.id} extra={extra} />)}
        </div>
      )}
    </div>
  );
}

function toForm(extra) {
  return {
    name:        extra.name        || '',
    category:    extra.category    || '',
    quantity:    extra.quantity    || '1',
    price:       extra.price       || '',
    description: extra.description || '',
    notes:       extra.notes       || '',
    sourceUrl:   extra.sourceUrl   || '',
    imageUrls:   Array.isArray(extra.imageUrls) ? extra.imageUrls : [],
    status:      extra.status      || 'planned',
  };
}
