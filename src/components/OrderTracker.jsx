import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addOrder, updateOrder, deleteOrder, COMPONENT_LABELS, ORDER_STATUSES } from '../db/database';

const STATUS_COLORS = {
  pending:   'status-ordered',
  shipped:   'status-received',
  delivered: 'status-installed',
  cancelled: 'status-planned',
};

const emptyForm = {
  componentType: '',
  itemName: '',
  vendor: '',
  price: '',
  orderDate: new Date().toISOString().slice(0, 10),
  expectedDelivery: '',
  trackingNumber: '',
  status: 'pending',
  notes: '',
};

export default function OrderTracker({ buildId }) {
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const orders = useLiveQuery(
    () => db.orders.where('buildId').equals(buildId).sortBy('orderDate'),
    [buildId]
  ) || [];

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

  const openNew = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (order) => {
    setForm({ ...order });
    setEditId(order.id);
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await updateOrder(editId, form);
    } else {
      await addOrder(buildId, form);
    }
    setShowForm(false);
    setEditId(null);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this order?')) await deleteOrder(id);
  };

  return (
    <div className="order-tracker">
      <div className="order-header">
        <div>
          <h3 style={{ margin: 0 }}>Orders</h3>
          <span className="order-total">Total spent: ${totalSpent.toFixed(2)}</span>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Order</button>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {['all', ...ORDER_STATUSES].map(s => (
          <button
            key={s}
            className={`filter-tab${filter === s ? ' active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span className="tab-count">
                {orders.filter(o => o.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <form className="order-form" onSubmit={handleSubmit}>
          <div className="order-form-grid">
            <div className="input-group">
              <label>Component</label>
              <select name="componentType" value={form.componentType} onChange={handleChange}>
                <option value="">— select —</option>
                {Object.entries(COMPONENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Item Name *</label>
              <input name="itemName" value={form.itemName} onChange={handleChange} required />
            </div>
            <div className="input-group">
              <label>Vendor</label>
              <input name="vendor" value={form.vendor} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Price ($)</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Order Date</label>
              <input name="orderDate" type="date" value={form.orderDate} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Expected Delivery</label>
              <input name="expectedDelivery" type="date" value={form.expectedDelivery} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Tracking #</label>
              <input name="trackingNumber" value={form.trackingNumber} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                {ORDER_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows="2" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Save'} Order</button>
            <button type="button" className="btn" onClick={cancel}>Cancel</button>
          </div>
        </form>
      )}

      {/* Orders table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          {filter === 'all' ? 'No orders yet — add one above.' : `No ${filter} orders.`}
        </div>
      ) : (
        <div className="orders-list">
          {filtered.map(order => (
            <div key={order.id} className="order-row">
              <div className="order-row-main">
                <div>
                  <span className="order-item-name">{order.itemName}</span>
                  {order.componentType && (
                    <span className="order-component-tag">
                      {COMPONENT_LABELS[order.componentType] || order.componentType}
                    </span>
                  )}
                </div>
                <div className="order-row-meta">
                  {order.vendor && <span className="meta-chip">{order.vendor}</span>}
                  {order.price && <span className="meta-chip">${parseFloat(order.price).toFixed(2)}</span>}
                  {order.orderDate && <span className="meta-chip">{order.orderDate}</span>}
                  {order.expectedDelivery && (
                    <span className="meta-chip">ETA {order.expectedDelivery}</span>
                  )}
                  {order.trackingNumber && (
                    <span className="meta-chip tracking">🔍 {order.trackingNumber}</span>
                  )}
                  <span className={`status-badge ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                {order.notes && <p className="order-notes">{order.notes}</p>}
              </div>
              <div className="order-row-actions">
                <button className="btn btn-sm" onClick={() => openEdit(order)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(order.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
