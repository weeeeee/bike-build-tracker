import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, associateCustomerToBuild, COMPONENT_LABELS, addManualPartsCost, deleteManualPartsCost } from '../db/database';

export default function BookkeepingCMS() {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [linkBuildId, setLinkBuildId] = useState('');
  const [manualPartName, setManualPartName] = useState('');
  const [manualPartPrice, setManualPartPrice] = useState('');

  // Fetch all customers, builds, and invoices
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const builds = useLiveQuery(() => db.builds.toArray()) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];

  // Fetch all components, orders, and extras to reconcile
  const allComponents = useLiveQuery(() => db.components.toArray()) || [];
  const allOrders = useLiveQuery(() => db.orders.toArray()) || [];
  const allExtras = useLiveQuery(() => db.extras.toArray()) || [];
  const allManualCosts = useLiveQuery(() => db.manualPartsCosts ? db.manualPartsCosts.toArray() : []) || [];

  const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));

  // Builds associated with the selected customer
  const customerBuilds = builds.filter(b => b.customerId === parseInt(selectedCustomerId));

  // Builds available to be linked (either unassociated or linked to someone else)
  const availableBuilds = builds.filter(b => !b.customerId);

  const handleLinkBuild = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !linkBuildId) return;
    await associateCustomerToBuild(parseInt(linkBuildId), parseInt(selectedCustomerId));
    setLinkBuildId('');
  };

  const handleUnlinkBuild = async (buildId) => {
    if (confirm('Are you sure you want to unlink this bike build from this customer?')) {
      await associateCustomerToBuild(buildId, null);
    }
  };

  const handleAddManualCost = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !manualPartName || !manualPartPrice) return;
    await addManualPartsCost(parseInt(selectedCustomerId), {
      name: manualPartName,
      price: parseFloat(manualPartPrice) || 0
    });
    setManualPartName('');
    setManualPartPrice('');
  };

  const handleDeleteManualCost = async (id) => {
    if (confirm('Are you sure you want to delete this manual parts cost?')) {
      await deleteManualPartsCost(id);
    }
  };

  // Reconciliation Logic
  const getReconciliationData = () => {
    if (!selectedCustomerId) return null;

    // 1. Gather all ordered/purchased parts across all associated builds
    const trackedParts = [];
    customerBuilds.forEach(build => {
      // Find components marked as ordered, received, or installed
      const buildComps = allComponents.filter(c => 
        c.buildId === build.id && 
        c.name && 
        ['ordered', 'received', 'installed'].includes(c.status)
      );
      buildComps.forEach(c => {
        trackedParts.push({
          id: `comp-${c.id}`,
          type: 'component',
          buildName: build.name,
          label: COMPONENT_LABELS[c.type] || c.type,
          name: c.name,
          price: parseFloat(c.price) || 0,
          status: c.status,
          rawItem: c
        });
      });

      // Find custom orders (excluding cancelled)
      const buildOrders = allOrders.filter(o => 
        o.buildId === build.id && 
        o.status !== 'cancelled'
      );
      buildOrders.forEach(o => {
        trackedParts.push({
          id: `order-${o.id}`,
          type: 'order',
          buildName: build.name,
          label: COMPONENT_LABELS[o.componentType] || 'Custom Order',
          name: o.itemName,
          price: parseFloat(o.price) || 0,
          status: o.status,
          rawItem: o
        });
      });

      // Find extras
      const buildExtras = allExtras.filter(e => e.buildId === build.id);
      buildExtras.forEach(e => {
        trackedParts.push({
          id: `extra-${e.id}`,
          type: 'extra',
          buildName: build.name,
          label: e.category || 'Accessory/Extra',
          name: e.description || 'Unnamed Extra',
          price: (parseFloat(e.price) || 0) * (parseInt(e.quantity) || 1),
          status: 'added',
          rawItem: e
        });
      });
    });

    // Gather all manually added parts costs for this customer
    const customerManualCosts = allManualCosts.filter(m => m.customerId === parseInt(selectedCustomerId));
    customerManualCosts.forEach(m => {
      trackedParts.push({
        id: `manual-${m.id}`,
        type: 'manual',
        buildName: 'Manual Entry',
        label: 'Manual Cost',
        name: m.name,
        price: parseFloat(m.price) || 0,
        status: 'added',
        rawItem: m
      });
    });

    // 2. Gather all billed items from customer's invoices
    const billedItems = [];
    const customerInvoices = invoices.filter(inv => inv.customerId === parseInt(selectedCustomerId));
    
    customerInvoices.forEach(inv => {
      let itemsList = [];
      try {
        itemsList = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
      } catch (e) {
        console.error('Failed to parse invoice items:', e);
      }

      itemsList.forEach((item, idx) => {
        billedItems.push({
          id: `inv-${inv.id}-item-${idx}`,
          invoiceId: inv.id,
          invoiceStatus: inv.status,
          description: item.description || 'Line Item',
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          total: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
          taxable: item.taxable !== false,
          matched: false
        });
      });
    });

    // 3. Match tracked parts against billed items
    const matches = [];
    const unmatchedParts = [];
    
    // Create copies to track match state
    const invoiceItemsCopy = billedItems.map(item => ({ ...item }));

    trackedParts.forEach(part => {
      // Find a matching invoice line item based on description text overlap
      const partNameLower = part.name.toLowerCase();
      const matchIndex = invoiceItemsCopy.findIndex(item => {
        if (item.matched) return false;
        if (!item.taxable) return false; // Exclude non-taxable labor costs from matching parts cost
        const descLower = item.description.toLowerCase();
        return descLower.includes(partNameLower) || partNameLower.includes(descLower);
      });

      if (matchIndex !== -1) {
        const matchedItem = invoiceItemsCopy[matchIndex];
        matchedItem.matched = true;
        
        matches.push({
          part,
          invoiceItem: matchedItem,
          status: matchedItem.total >= part.price ? 'balanced' : 'discrepancy'
        });
      } else {
        unmatchedParts.push(part);
      }
    });

    const unmatchedInvoiceItems = invoiceItemsCopy.filter(item => !item.matched);

    // 4. Calculate Summary Financials
    const manualPartsCost = customerManualCosts.reduce((sum, m) => sum + m.price, 0);
    const billedPartsRevenue = billedItems.filter(i => i.taxable).reduce((sum, i) => sum + i.total, 0);
    const totalPartsCost = billedPartsRevenue + manualPartsCost;
    const partsProfit = billedPartsRevenue - totalPartsCost;
    const partsMarginPercent = billedPartsRevenue > 0 ? (partsProfit / billedPartsRevenue) * 100 : 0;
    
    const billedLaborRevenue = billedItems.filter(i => !i.taxable).reduce((sum, i) => sum + i.total, 0);
    const totalInvoiceRevenue = billedItems.reduce((sum, i) => sum + i.total, 0);
    const unbilledLeakage = unmatchedParts.reduce((sum, p) => sum + p.price, 0);
    const totalProfit = billedLaborRevenue + partsProfit;

    return {
      trackedParts,
      billedItems,
      matches,
      unmatchedParts,
      unmatchedInvoiceItems,
      metrics: {
        totalPartsCost,
        billedPartsRevenue,
        partsProfit,
        partsMarginPercent,
        billedLaborRevenue,
        totalInvoiceRevenue,
        unbilledLeakage,
        totalProfit
      }
    };
  };

  const recon = getReconciliationData();

  return (
    <div className="cms-container">
      <div className="dash-header">
        <div>
          <h2 style={{ margin: 0 }}>📊 Bookkeeping & Reconciliation</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Balance ordered component parts from the build tracker against billed items on customer invoices.
          </p>
        </div>
      </div>

      {/* Customer Selector & Association Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Customer Selector & Manual Cost Form */}
        <div className="comp-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>👥 Select Customer</h3>
            <div className="input-group" style={{ marginBottom: selectedCustomer ? '1rem' : 0 }}>
              <select 
                value={selectedCustomerId} 
                onChange={e => { setSelectedCustomerId(e.target.value); }}
                style={{ padding: '0.75rem', fontSize: '1rem' }}
              >
                <option value="">— Choose a Customer —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.phone || c.email || 'No contact details'})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {selectedCustomer && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>➕ Add Manual Parts Cost</h4>
              <form onSubmit={handleAddManualCost} style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <input 
                    type="text" 
                    value={manualPartName} 
                    onChange={e => setManualPartName(e.target.value)} 
                    placeholder="Part Name (e.g. Brooks saddle)" 
                    style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                    required 
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="input-group" style={{ margin: 0, flex: 1 }}>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={manualPartPrice} 
                      onChange={e => setManualPartPrice(e.target.value)} 
                      placeholder="Cost ($)" 
                      style={{ padding: '0.55rem', fontSize: '0.85rem' }}
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    Add Cost
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Build Linker */}
        {selectedCustomer && (
          <div className="comp-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>🔗 Associated Builds</h3>
            
            {customerBuilds.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', margin: '0 0 1rem 0' }}>
                No bike builds currently associated with this customer.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {customerBuilds.map(b => (
                  <span 
                    key={b.id} 
                    style={{ 
                      background: 'var(--bg-elevated)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px', 
                      padding: '0.35rem 0.65rem', 
                      fontSize: '0.85rem', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem' 
                    }}
                  >
                    🚲 {b.name}
                    <button 
                      onClick={() => handleUnlinkBuild(b.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}
                      title="Unlink Build"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Associate New Build Form */}
            <form onSubmit={handleLinkBuild} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div className="input-group" style={{ margin: 0, flex: 1 }}>
                <label style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Link Existing Bike Build</label>
                <select 
                  value={linkBuildId} 
                  onChange={e => setLinkBuildId(e.target.value)} 
                  required
                >
                  <option value="">— select build —</option>
                  {availableBuilds.map(b => (
                    <option key={b.id} value={b.id}>🚲 {b.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1rem' }}>
                Link
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main Reconciliation Dashboard */}
      {selectedCustomer ? (
        recon && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Financial Health / Summary Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
              <div className="stat-chip" style={{ padding: '1rem 0.75rem', textAlign: 'left', background: 'var(--bg-card)' }}>
                <span className="stat-lbl" style={{ fontSize: '0.8rem' }}>Total Parts Cost</span>
                <span className="stat-val" style={{ color: 'var(--text-main)', fontSize: '1.4rem' }}>
                  ${recon.metrics.totalPartsCost.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Taxable items + manual</span>
              </div>

              <div className="stat-chip" style={{ padding: '1rem 0.75rem', textAlign: 'left', background: 'var(--bg-card)' }}>
                <span className="stat-lbl" style={{ fontSize: '0.8rem' }}>Billed Parts Rev</span>
                <span className="stat-val" style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>
                  ${recon.metrics.billedPartsRevenue.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Taxable items</span>
              </div>

              <div className="stat-chip" style={{ padding: '1rem 0.75rem', textAlign: 'left', background: 'var(--bg-card)' }}>
                <span className="stat-lbl" style={{ fontSize: '0.8rem' }}>Parts Profit</span>
                <span className="stat-val" style={{ color: recon.metrics.partsProfit >= 0 ? 'var(--accent)' : 'var(--danger)', fontSize: '1.4rem' }}>
                  ${recon.metrics.partsProfit.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {recon.metrics.partsMarginPercent.toFixed(1)}% margin
                </span>
              </div>

              <div className="stat-chip" style={{ padding: '1rem 0.75rem', textAlign: 'left', background: 'var(--bg-card)' }}>
                <span className="stat-lbl" style={{ fontSize: '0.8rem' }}>Billed Labor Rev</span>
                <span className="stat-val" style={{ color: '#fbbf24', fontSize: '1.4rem' }}>
                  ${recon.metrics.billedLaborRevenue.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Non-taxable labor</span>
              </div>

              <div className="stat-chip" style={{ padding: '1rem 0.75rem', textAlign: 'left', background: recon.metrics.unbilledLeakage > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)', border: recon.metrics.unbilledLeakage > 0 ? '1px solid var(--danger)' : '1px solid var(--border)' }}>
                <span className="stat-lbl" style={{ color: recon.metrics.unbilledLeakage > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.8rem' }}>Unbilled Leakage</span>
                <span className="stat-val" style={{ color: recon.metrics.unbilledLeakage > 0 ? 'var(--danger)' : 'var(--text-muted)', fontSize: '1.4rem' }}>
                  ${recon.metrics.unbilledLeakage.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {recon.unmatchedParts.length} parts unbilled
                </span>
              </div>

              <div className="stat-chip" style={{ padding: '1rem 0.75rem', textAlign: 'left', background: 'var(--bg-card)' }}>
                <span className="stat-lbl" style={{ fontSize: '0.8rem' }}>Total Profit</span>
                <span className="stat-val" style={{ color: recon.metrics.totalProfit >= 0 ? 'var(--accent)' : 'var(--danger)', fontSize: '1.4rem' }}>
                  ${recon.metrics.totalProfit.toFixed(2)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Labor + parts profit</span>
              </div>
            </div>

            {/* Reconciliation Comparison Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              
              {/* Left Column: Parts Tracker Details */}
              <div className="comp-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📦 Tracked Parts cost</span>
                  <span className="status-badge status-ordered" style={{ fontSize: '0.75rem' }}>{recon.trackedParts.length} Total</span>
                </h3>
                
                {recon.trackedParts.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No parts ordered or installed for this customer's builds yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Balanced / Matched Parts */}
                    {recon.matches.map(({ part, invoiceItem, status }) => (
                      <div key={part.id} className="order-row" style={{ borderLeft: status === 'balanced' ? '4px solid var(--accent)' : '4px solid #f59e0b', padding: '0.75rem' }}>
                        <div className="order-row-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{part.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {part.label} ({part.buildName})
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.78rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Cost: ${part.price.toFixed(2)}</span>
                              <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Billed: ${invoiceItem.total.toFixed(2)}</span>
                            </div>
                          </div>
                          {part.type === 'manual' && (
                            <button 
                              onClick={() => handleDeleteManualCost(part.rawItem.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0 0.5rem', fontSize: '1.1rem', alignSelf: 'center' }}
                              title="Delete manual cost"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <span className={`status-badge ${status === 'balanced' ? 'status-installed' : 'status-ordered'}`} style={{ fontSize: '0.7rem' }}>
                          {status === 'balanced' ? '✓ Balanced' : '⚠ Price Diff'}
                        </span>
                      </div>
                    ))}

                    {/* Unbilled Leakage Parts */}
                    {recon.unmatchedParts.map(part => (
                      <div key={part.id} className="order-row" style={{ borderLeft: '4px solid var(--danger)', padding: '0.75rem' }}>
                        <div className="order-row-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>{part.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {part.label} ({part.buildName})
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.78rem' }}>
                              <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Unbilled Cost: ${part.price.toFixed(2)}</span>
                            </div>
                          </div>
                          {part.type === 'manual' && (
                            <button 
                              onClick={() => handleDeleteManualCost(part.rawItem.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0 0.5rem', fontSize: '1.1rem', alignSelf: 'center' }}
                              title="Delete manual cost"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                        <span className="status-badge status-planned" style={{ fontSize: '0.7rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)' }}>
                          ❌ Unbilled
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Billed Items Details */}
              <div className="comp-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>💵 Invoice billing</span>
                  <span className="status-badge status-received" style={{ fontSize: '0.75rem' }}>{recon.billedItems.length} Total</span>
                </h3>

                {recon.billedItems.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No invoices generated for this customer yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Reconciled / Matched Billing */}
                    {recon.matches.map(({ part, invoiceItem }) => (
                      <div key={invoiceItem.id} className="order-row" style={{ borderLeft: '4px solid var(--accent)', padding: '0.75rem' }}>
                        <div className="order-row-main">
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{invoiceItem.description}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Qty {invoiceItem.quantity} @ ${invoiceItem.price.toFixed(2)}/ea (Invoice #{invoiceItem.invoiceId})
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.78rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Total Billed: ${invoiceItem.total.toFixed(2)}</span>
                            <span className="status-badge status-installed" style={{ fontSize: '0.65rem', padding: '0.05rem 0.4rem' }}>
                              PART
                            </span>
                          </div>
                        </div>
                        <span className="status-badge status-installed" style={{ fontSize: '0.7rem' }}>
                          Matched
                        </span>
                      </div>
                    ))}

                    {/* Unmatched / Manual / Labor billing */}
                    {recon.unmatchedInvoiceItems.map(item => (
                      <div key={item.id} className="order-row" style={{ borderLeft: item.taxable ? '4px solid var(--primary)' : '4px solid #fbbf24', padding: '0.75rem' }}>
                        <div className="order-row-main">
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.description}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Qty {item.quantity} @ ${item.price.toFixed(2)}/ea (Invoice #{item.invoiceId})
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.78rem', alignItems: 'center' }}>
                            <span style={{ color: item.taxable ? 'var(--primary)' : '#fbbf24', fontWeight: 'bold' }}>Amount Billed: ${item.total.toFixed(2)}</span>
                            <span className="status-badge" style={{ 
                              fontSize: '0.65rem', 
                              padding: '0.05rem 0.4rem',
                              background: item.taxable ? 'rgba(59, 130, 246, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                              color: item.taxable ? 'var(--primary)' : '#fbbf24',
                              border: item.taxable ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)'
                            }}>
                              {item.taxable ? 'PART' : 'LABOR'}
                            </span>
                          </div>
                        </div>
                        <span className="status-badge" style={{ 
                          fontSize: '0.7rem', 
                          background: item.taxable ? 'rgba(59, 130, 246, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                          color: item.taxable ? 'var(--primary)' : '#fbbf24'
                        }}>
                          Unmatched
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )
      ) : (
        <div className="empty-state big" style={{ background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
          <div className="empty-icon">📊</div>
          <h3>Select a customer to begin bookkeeping</h3>
          <p>Reconcile and balance your parts tracking sheet against final customer billing invoices.</p>
        </div>
      )}
    </div>
  );
}
