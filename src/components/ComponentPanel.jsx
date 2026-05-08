import React, { useState, useEffect } from 'react';
import { updateComponent, COMPONENT_STATUSES } from '../db/database';
import ImageUpload from './ImageUpload';

const STATUS_BADGE = {
  planned:  'status-planned',
  ordered:  'status-ordered',
  received: 'status-received',
  installed:'status-installed',
};

export default function ComponentPanel({ component, label }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: component.name || '',
    imageUrl: component.imageUrl || '',
    price: component.price || '',
    description: component.description || '',
    notes: component.notes || '',
    status: component.status || 'planned',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync external changes (e.g. after save)
  useEffect(() => {
    setForm({
      name: component.name || '',
      imageUrl: component.imageUrl || '',
      price: component.price || '',
      description: component.description || '',
      notes: component.notes || '',
      status: component.status || 'planned',
    });
  }, [component]);

  const isFilled = Boolean(component.name?.trim());

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateComponent(component.id, form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    setOpen(false);
  };

  const handleClear = async () => {
    if (!confirm(`Clear all data for ${label}?`)) return;
    const cleared = { name: '', imageUrl: '', price: '', description: '', notes: '', status: 'planned' };
    setForm(cleared);
    await updateComponent(component.id, cleared);
    setOpen(false);
  };

  return (
    <div className={`comp-panel${isFilled ? ' filled' : ''}${open ? ' open' : ''}`}>
      {/* Header row */}
      <div className="comp-panel-header" onClick={() => setOpen(o => !o)}>
        <div className="comp-panel-left">
          <span className={`comp-filled-dot${isFilled ? ' on' : ''}`} />
          <span className="comp-label">{label}</span>
          {isFilled && (
            <>
              <span className="comp-name-preview">{component.name}</span>
              {component.price && (
                <span className="comp-price-preview">${parseFloat(component.price).toFixed(2)}</span>
              )}
            </>
          )}
        </div>
        <div className="comp-panel-right">
          <span className={`status-badge ${STATUS_BADGE[component.status] || 'status-planned'}`}>
            {component.status || 'planned'}
          </span>
          <span className="comp-chevron">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded form */}
      {open && (
        <form className="comp-form" onSubmit={handleSave}>
          <div className="comp-form-grid">
            <div className="input-group">
              <label>Component Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={`e.g. Shimano Ultegra ${label}`}
                autoFocus
              />
            </div>
            <div className="input-group">
              <label>Price ($)</label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Status</label>
            <div className="status-radio-group">
              {COMPONENT_STATUSES.map(s => (
                <label key={s} className={`status-radio${form.status === s ? ' selected' : ''} ${STATUS_BADGE[s]}`}>
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={handleChange}
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="2"
              placeholder="Specs, model info..."
            />
          </div>

          <div className="input-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="2"
              placeholder="Compatibility notes, installation notes..."
            />
          </div>

          <div className="input-group">
            <label>Image</label>
            <ImageUpload
              value={form.imageUrl}
              onChange={url => setForm(prev => ({ ...prev, imageUrl: url }))}
            />
          </div>

          <div className="comp-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
            {isFilled && (
              <button type="button" className="btn btn-danger" onClick={handleClear}>
                Clear
              </button>
            )}
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filled image thumbnail (collapsed view) */}
      {!open && isFilled && component.imageUrl && (
        <div className="comp-thumb">
          <img src={component.imageUrl} alt={component.name} />
        </div>
      )}
    </div>
  );
}
