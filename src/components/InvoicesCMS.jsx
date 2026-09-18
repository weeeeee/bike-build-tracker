import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createInvoice, updateInvoice, deleteInvoice, fetchInvoiceImageUrl } from '../db/database';
import { loadImage, scaledJpeg } from '../utils/imageFile';


export default function InvoicesCMS() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'quote', 'invoice'
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [docType, setDocType] = useState('invoice'); // 'quote' or 'invoice'
  const [status, setStatus] = useState('Draft');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [bikeImageNew, setBikeImageNew] = useState(null); // data URL picked in this form session
  const [bikeImageRemoved, setBikeImageRemoved] = useState(false);
  const [bikeImagePreview, setBikeImagePreview] = useState(null);
  const [bikeImageError, setBikeImageError] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0, taxable: true }]);

  // Print Preview state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activePrintDoc, setActivePrintDoc] = useState(null);
  const [printSession, setPrintSession] = useState(0);
  const [printImage, setPrintImage] = useState(null); // { session, url } for the previewed document's bike photo




  // Queries
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const customerMap = React.useMemo(() => {
    const map = {};
    customers.forEach(c => { map[c.id] = c; });
    return map;
  }, [customers]);

  useEffect(() => {
    if (!showPrintModal || !activePrintDoc?.hasBikeImage) return undefined;
    let cancelled = false;
    let url = null;
    const session = printSession;
    fetchInvoiceImageUrl(activePrintDoc.id)
      .then(u => {
        if (cancelled) URL.revokeObjectURL(u);
        else { url = u; setPrintImage({ session, url: u }); }
      })
      .catch(() => {});
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [showPrintModal, printSession, activePrintDoc?.id, activePrintDoc?.hasBikeImage]);
  const printImageUrl = printImage && printImage.session === printSession ? printImage.url : null;

  // Handle Form line items change
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    if (field === 'taxable') {
      updated[index][field] = value;
    } else if (field === 'quantity') {
      updated[index][field] = parseInt(value) || 0;
    } else if (field === 'price') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { description: '', quantity: 1, price: 0, taxable: true }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Calculations
  const calculateTotals = (itemsList, discountInput = 0) => {
    let subtotal = 0;
    let taxableAmount = 0;
    itemsList.forEach(item => {
      const lineTotal = (item.quantity || 0) * (item.price || 0);
      subtotal += lineTotal;
      if (item.taxable) {
        taxableAmount += lineTotal;
      }
    });
    const tax = taxableAmount * 0.06;
    const discount = Math.min(Math.max(0, parseFloat(discountInput) || 0), subtotal + tax);
    const total = subtotal + tax - discount;
    return { subtotal, tax, discount, total };
  };

  const resetBikeImage = () => {
    setBikeImageNew(null); setBikeImageRemoved(false); setBikeImagePreview(null); setBikeImageError('');
  };

  const handleBikeImageChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setBikeImageError('Please choose a photo (JPG or PNG).'); return; }
    try {
      const dataUrl = scaledJpeg(await loadImage(file), 1600, 0.85);
      setBikeImageNew(dataUrl); setBikeImagePreview(dataUrl); setBikeImageRemoved(false); setBikeImageError('');
    } catch (err) {
      setBikeImageError(err.message);
    }
  };

  const removeBikeImage = () => {
    setBikeImageNew(null); setBikeImagePreview(null); setBikeImageRemoved(true);
  };

  const openAddModal = () => {
    setEditId(null);
    setCustomerId(customers[0]?.id || '');
    setDocType('invoice');
    setStatus('Draft');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate('');
    setNotes('Payment due upon receipt. Thank you for your business!');
    setDiscount('');
    resetBikeImage();
    setItems([{ description: '', quantity: 1, price: 0, taxable: true }]);
    setShowModal(true);
  };

  const openEditModal = (inv) => {
    setEditId(inv.id);
    setCustomerId(inv.customerId || '');
    setDocType(inv.type || 'invoice');
    setStatus(inv.status || 'Draft');
    setIssueDate(inv.issueDate || '');
    setDueDate(inv.dueDate || '');
    setNotes(inv.notes || '');
    setDiscount(inv.discount ? String(inv.discount) : '');
    resetBikeImage();
    if (inv.hasBikeImage) fetchInvoiceImageUrl(inv.id).then(setBikeImagePreview).catch(() => {});
    setItems(Array.isArray(inv.items) && inv.items.length > 0 ? inv.items : [{ description: '', quantity: 1, price: 0, taxable: true }]);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      alert('Please select a customer first.');
      return;
    }

    const { subtotal, tax, discount: appliedDiscount, total } = calculateTotals(items, discount);
    const fields = {
      customerId: parseInt(customerId),
      type: docType,
      status,
      issueDate,
      dueDate: dueDate || null,
      items,
      subtotal,
      tax,
      discount: appliedDiscount,
      total,
      notes: notes.trim(),
      ...(bikeImageNew ? { bikeImage: bikeImageNew } : bikeImageRemoved ? { bikeImage: null } : {})
    };

    if (editId) {
      await updateInvoice(editId, fields);
    } else {
      await createInvoice(fields);
    }
    setShowModal(false);
  };

  const handleDelete = async (id, type) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      await deleteInvoice(id);
    }
  };

  const triggerPrint = (inv) => {
    setPrintSession(n => n + 1);
    setActivePrintDoc(inv);
    setShowPrintModal(true);
  };

  // The server's PUT rewrites every column, so send the full invoice with only the status changed.
  const handleMarkPaid = async (inv) => {
    const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
    await updateInvoice(inv.id, { ...inv, items, status: 'Paid' });
    setActivePrintDoc(prev => (prev && prev.id === inv.id ? { ...prev, status: 'Paid' } : prev));
  };




  // Search & Filtering
  const filteredInvoices = invoices.filter(inv => {
    const cust = customerMap[inv.customerId];
    const custName = cust ? `${cust.firstName} ${cust.lastName}`.toLowerCase() : '';
    const matchesSearch = custName.includes(search.toLowerCase()) || 
                          (inv.notes && inv.notes.toLowerCase().includes(search.toLowerCase())) ||
                          inv.status.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || inv.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totals = calculateTotals(items, discount);

  return (

    <div className="cms-container invoices-area">
      <div className="dash-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Quotes & Invoices</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage and print shop quotes and customer invoices. KY Sales Tax (6%) applied on parts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search customer or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', minWidth: '220px' }}
          />
          <button className="btn btn-primary" onClick={openAddModal}>
            + Create New
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ margin: 0, whiteSpace: 'nowrap' }}>Document Type:</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 'auto', padding: '0.4rem 1.5rem 0.4rem 0.6rem' }}>
            <option value="all">All Documents</option>
            <option value="quote">Quotes Only</option>
            <option value="invoice">Invoices Only</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ margin: 0, whiteSpace: 'nowrap' }}>Status:</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', padding: '0.4rem 1.5rem 0.4rem 0.6rem' }}>
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
          </select>
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="empty-state big" style={{ marginTop: '1.5rem' }}>
          <div className="empty-icon">📄</div>
          <h3>No documents found</h3>
          <p>{search || typeFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first Quote or Invoice to invoice a customer.'}</p>
          {typeFilter === 'all' && statusFilter === 'all' && !search && (
            <button className="btn btn-primary" onClick={openAddModal}>
              + Create New
            </button>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Customer</th>
                <th style={{ padding: '1rem' }}>Issue Date</th>
                <th style={{ padding: '1rem' }}>Due Date</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Subtotal</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Tax (6%)</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const cust = customerMap[inv.customerId] || { firstName: 'Unknown', lastName: 'Customer' };
                const isQuote = inv.type === 'quote';

                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                      <span className={`status-badge ${isQuote ? 'status-ordered' : 'status-received'}`}>
                        {isQuote ? 'Quote' : 'Invoice'}
                      </span>
                      {inv.hasBikeImage && <span title="Includes a bike photo" style={{ marginLeft: '0.5rem' }}>📷</span>}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>
                      {cust.firstName} {cust.lastName}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{inv.issueDate}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{inv.dueDate || '—'}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>${(inv.subtotal || 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--brand-primary)' }}>${(inv.tax || 0).toFixed(2)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent)' }}>
                      ${(inv.total || 0).toFixed(2)}
                      {inv.discount > 0 && (
                        <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                          incl. -${inv.discount.toFixed(2)} discount
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span className={`status-badge ${
                        inv.status === 'Paid' || inv.status === 'Approved' ? 'status-installed' :
                        inv.status === 'Sent' ? 'status-received' :
                        inv.status === 'Declined' ? 'status-planned' : 'status-planned'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                        <button className="btn btn-sm" onClick={() => triggerPrint(inv)} title="Print / View PDF">
                          🖨️ View
                        </button>
                        <button className="btn btn-sm btn-icon" onClick={() => openEditModal(inv)} title="Edit">
                          ✏️
                        </button>
                        {inv.type === 'invoice' && inv.status !== 'Paid' && (
                          <button
                            className="btn btn-sm btn-accent"
                            onClick={() => handleMarkPaid(inv)}
                            title="Mark this invoice as paid (after it's been paid in Found)"
                          >
                            ✓ Mark Paid
                          </button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(inv.id, inv.type)} title="Delete">
                          🗑️
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h3>{editId ? 'Edit Document' : 'Create Quote/Invoice'}</h3>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                
                {/* Top Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="input-group">
                    <label>Document Type</label>
                    <select value={docType} onChange={e => {
                      setDocType(e.target.value);
                      setStatus(e.target.value === 'quote' ? 'Draft' : 'Draft');
                    }}>
                      <option value="invoice">Invoice</option>
                      <option value="quote">Quote</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Select Customer *</label>
                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                      <option value="" disabled>-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.phone || 'No Phone'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)}>
                      {docType === 'quote' ? (
                        <>
                          <option value="Draft">Draft</option>
                          <option value="Sent">Sent</option>
                          <option value="Approved">Approved</option>
                          <option value="Declined">Declined</option>
                        </>
                      ) : (
                        <>
                          <option value="Draft">Draft</option>
                          <option value="Sent">Sent</option>
                          <option value="Paid">Paid</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="input-group">
                    <label>Issue Date</label>
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label>Due Date / Expiration Date</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                </div>

                {/* Line Items */}
                <h4 style={{ margin: '1.5rem 0 0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-main)' }}>Line Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.25fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Description (e.g. Tubeless Gravel Tire, Brake Bleed Service)"
                        value={item.description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Unit Price"
                        value={item.price || ''}
                        onChange={e => handleItemChange(index, 'price', e.target.value)}
                        required
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={item.taxable}
                          onChange={e => handleItemChange(index, 'taxable', e.target.checked)}
                          style={{ width: 'auto', cursor: 'pointer' }}
                        />
                        Tax (6%)
                      </label>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItemRow(index)}
                        disabled={items.length === 1}
                        style={{ height: '36px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-sm" onClick={addItemRow} style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                    + Add Item Row
                  </button>
                </div>

                {/* Bike photo (optional) */}
                <div className="input-group" style={{ marginTop: '1.5rem' }}>
                  <label>
                    Bike photo <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(optional — printed on the quote/PDF)</span>
                  </label>
                  {bikeImagePreview && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.6rem' }}>
                      <img src={bikeImagePreview} alt="Bike preview" style={{ maxHeight: '140px', maxWidth: '240px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border)', background: '#fff' }} />
                      <button type="button" className="btn btn-sm btn-danger" onClick={removeBikeImage}>Remove photo</button>
                    </div>
                  )}
                  <input type="file" accept="image/*" aria-label="Bike photo" onChange={handleBikeImageChange} />
                  {bikeImageError && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.35rem' }}>{bikeImageError}</div>}
                </div>

                {/* Notes and Totals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
                  <div className="input-group">
                    <label>Notes / Terms / Special Instructions</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows="4"
                      placeholder="Enter terms (e.g., Net 30, Quote valid for 15 days)..."
                    />
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignSelf: 'start' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span>Subtotal:</span>
                      <span>${totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--brand-primary)' }}>
                      <span>KY Sales Tax (6%):</span>
                      <span>${totals.tax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', gap: '0.5rem' }}>
                      <span>Discount ($):</span>
                      <input
                        type="number" min="0" step="0.01" placeholder="0.00" aria-label="Discount amount"
                        value={discount} onChange={e => setDiscount(e.target.value)}
                        style={{ width: '110px', padding: '0.3rem 0.5rem', textAlign: 'right' }}
                      />
                    </div>
                    {(parseFloat(discount) || 0) > totals.discount && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Discount can't exceed the total — capped at ${totals.discount.toFixed(2)}.
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', color: 'var(--accent)' }}>
                      <span>Grand Total:</span>
                      <span>${totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">{editId ? 'Save Changes' : 'Save Document'}</button>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW / VIEW MODAL */}
      {showPrintModal && activePrintDoc && (() => {
        const cust = customerMap[activePrintDoc.customerId] || { firstName: 'Guest', lastName: 'Customer', phone: '', address: '', city: '', state: '', zipCode: '' };
        const isQuote = activePrintDoc.type === 'quote';
        const calc = calculateTotals(activePrintDoc.items || [], activePrintDoc.discount);

        return (
          <div className="modal-backdrop print-modal-backdrop" onClick={() => setShowPrintModal(false)}>
            <div className="modal-content print-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', background: '#ffffff', color: '#1e293b', border: 'none' }}>
              <div className="modal-header print-hide" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ color: '#0f172a' }}>{isQuote ? 'Quote' : 'Invoice'} Preview</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={() => window.print()}>
                    🖨️ Print / Save PDF
                  </button>
                  <button className="btn" onClick={() => setShowPrintModal(false)}>
                    Close
                  </button>
                </div>
              </div>
              
              {/* PRINT AREA */}
              <div id="invoice-print-area" style={{ padding: '2.5rem', fontFamily: "'Inter', sans-serif" }}>
                
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                  <div>
                    <img
                      src={`${import.meta.env.BASE_URL}weeecycle-logo.png`}
                      alt="Weeecycle.net — Recycle the Fun!"
                      style={{ display: 'block', height: '64px', width: 'auto', marginBottom: '0.5rem' }}
                    />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Road & Gravel Specialists</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Lexington, KY • steve@weeecycle.net</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: '800', textTransform: 'uppercase', color: '#0f172a' }}>
                      {isQuote ? 'Quote' : 'Invoice'}
                    </h2>
                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', color: '#64748b' }}><strong>Doc ID:</strong> #{activePrintDoc.id}</p>
                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', color: '#64748b' }}><strong>Date:</strong> {activePrintDoc.issueDate}</p>
                    {activePrintDoc.dueDate && (
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                        <strong>{isQuote ? 'Valid Until:' : 'Due Date:'}</strong> {activePrintDoc.dueDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Client / Customer Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#64748b' }}>
                      {isQuote ? 'Prepared For:' : 'Bill To:'}
                    </h4>
                    <h3 style={{ margin: '0 0 0.25rem', color: '#0f172a', fontSize: '1.1rem', fontWeight: '700' }}>
                      {cust.firstName} {cust.lastName}
                    </h3>
                    {cust.phone && <p style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', color: '#475569' }}>📞 {cust.phone}</p>}
                    {(cust.address || cust.city) && (
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                        📍 {cust.address && `${cust.address}, `}{cust.city && `${cust.city}, `}{cust.state} {cust.zipCode}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'inline-block', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', background: activePrintDoc.status === 'Paid' || activePrintDoc.status === 'Approved' ? '#d1fae5' : '#fef3c7', color: activePrintDoc.status === 'Paid' || activePrintDoc.status === 'Approved' ? '#065f46' : '#92400e', alignSelf: 'flex-end' }}>
                      Status: {activePrintDoc.status}
                    </div>
                  </div>
                </div>

                {printImageUrl && (
                  <div style={{ marginBottom: '2rem', textAlign: 'center', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <img src={printImageUrl} alt="Bike" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  </div>
                )}

                {/* Line Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Description</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', width: '80px' }}>Qty</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', width: '120px' }}>Unit Price</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', width: '80px' }}>Taxable</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', width: '120px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activePrintDoc.items || []).map((item, idx) => {
                      const amount = (item.quantity || 0) * (item.price || 0);
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#1e293b' }}>{item.description}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem', color: '#1e293b' }}>{item.quantity}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem', color: '#1e293b' }}>${(item.price || 0).toFixed(2)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>{item.taxable ? 'Yes' : 'No'}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>${amount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Footer Notes & Totals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                  <div>
                    {activePrintDoc.notes && (
                      <>
                        <h4 style={{ margin: '0 0 0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: '#64748b' }}>
                          Terms & Notes
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                          {activePrintDoc.notes}
                        </p>
                      </>
                    )}
                    {activePrintDoc.type === 'invoice' && activePrintDoc.status !== 'Paid' && (
                      <div className="print-hide" style={{ marginTop: '1.5rem', padding: '1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#065f46', fontWeight: 'bold', fontSize: '0.9rem' }}>Paid in Found?</span>
                        <button
                          className="btn btn-sm btn-accent"
                          onClick={() => handleMarkPaid(activePrintDoc)}
                        >
                          ✓ Mark Paid
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569' }}>
                      <span>Subtotal:</span>
                      <span>${calc.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569' }}>
                      <span>KY Sales Tax (6%):</span>
                      <span>${calc.tax.toFixed(2)}</span>
                    </div>
                    {calc.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#047857' }}>
                        <span>Discount:</span>
                        <span>-${calc.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '800', borderTop: '2px solid #0f172a', paddingTop: '0.6rem', color: '#0f172a' }}>
                      <span>Grand Total:</span>
                      <span>${calc.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Sign off */}
                <div style={{ marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a388' }}>
                  Thank you for supporting Weeecycle Workshop!
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
