import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createCustomer, updateCustomer, deleteCustomer, createJob } from '../db/database';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function CustomersCMS({ onNavigateToBoard }) {
  const [search, setSearch] = useState('');
  const [showCustModal, setShowCustModal] = useState(false);
  const [editCustId, setEditCustId] = useState(null);

  // Customer form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');


  // Job modal state
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobCust, setJobCust] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobBike, setJobBike] = useState('');
  const [jobCost, setJobCost] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const filteredCustomers = customers.filter(c => {
    const term = search.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName.includes(term) || (c.phone && c.phone.includes(term)) || (c.city && c.city.toLowerCase().includes(term));
  });

  const openAddModal = () => {
    setEditCustId(null);
    setFirstName(''); setLastName(''); setAddress('');
    setCity(''); setState('CA'); setZipCode(''); setPhone(''); setEmail('');
    setShowCustModal(true);
  };

  const openEditModal = (cust) => {
    setEditCustId(cust.id);
    setFirstName(cust.firstName || '');
    setLastName(cust.lastName || '');
    setAddress(cust.address || '');
    setCity(cust.city || '');
    setState(cust.state || 'CA');
    setZipCode(cust.zipCode || '');
    setPhone(cust.phone || '');
    setEmail(cust.email || '');
    setShowCustModal(true);
  };


  const handleCustSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    const fields = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address: address.trim(),
      city: city.trim(),
      state,
      zipCode: zipCode.trim(),
      phone: phone.trim(),
      email: email.trim()
    };

    if (editCustId) {
      await updateCustomer(editCustId, fields);
    } else {
      await createCustomer(fields);
    }
    setShowCustModal(false);
  };


  const handleDeleteCust = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? All associated service jobs will also be deleted.`)) {
      await deleteCustomer(id);
    }
  };

  const openJobModal = (cust) => {
    setJobCust(cust);
    setJobTitle('General Service');
    setJobBike('');
    setJobCost('');
    setJobNotes('');
    setShowJobModal(true);
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!jobCust || !jobTitle.trim()) return;

    await createJob({
      customerId: jobCust.id,
      title: jobTitle.trim(),
      bikeModel: jobBike.trim(),
      estimatedCost: jobCost.trim(),
      notes: jobNotes.trim(),
      stage: 'In the shop'
    });

    setShowJobModal(false);
    if (onNavigateToBoard) {
      onNavigateToBoard();
    }
  };

  return (
    <div className="cms-container">
      <div className="dash-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>Customer Directory (CMS)</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''} securely encrypted & tracked
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search name, phone, city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-main)', minWidth: '220px' }}
          />
          <button className="btn btn-primary" onClick={openAddModal}>
            + New Customer
          </button>
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="empty-state big" style={{ marginTop: '2rem' }}>
          <div className="empty-icon">👥</div>
          <h3>No customers found</h3>
          <p>{search ? 'No matches for your search query.' : 'Add your first customer contact to start booking service jobs.'}</p>
          {!search && (
            <button className="btn btn-primary" onClick={openAddModal}>
              + New Customer
            </button>
          )}
        </div>
      ) : (
        <div className="customer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
          {filteredCustomers.map(cust => (
            <div key={cust.id} className="build-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>{cust.firstName} {cust.lastName}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-icon" onClick={() => openEditModal(cust)} title="Edit Customer" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>✏️</button>
                    <button className="btn-icon" onClick={() => handleDeleteCust(cust.id, `${cust.firstName} ${cust.lastName}`)} title="Delete Customer" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>🗑️</button>
                  </div>
                </div>
                {cust.phone && <p style={{ margin: '0 0 0.4rem 0', color: 'var(--brand-primary)', fontWeight: 'bold' }}>📞 {cust.phone}</p>}
                {cust.email && <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>✉️ {cust.email}</p>}
                {(cust.address || cust.city || cust.state) && (
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                    📍 {cust.address && `${cust.address}, `}{cust.city && `${cust.city}, `}{cust.state} {cust.zipCode}
                  </p>
                )}
              </div>
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={() => openJobModal(cust)}>
                  📋 Create Service Job
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Modal */}
      {showCustModal && (
        <div className="modal-overlay" onClick={() => setShowCustModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>{editCustId ? 'Edit Customer' : 'New Customer'}</h3>
            <form onSubmit={handleCustSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>First Name *</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus required />
                </div>
                <div className="input-group">
                  <label>Last Name *</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
              </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" />
                </div>
                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" />
                </div>
              </div>

              <div className="input-group">
                <label>Address</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>City</label>
                  <input value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>State</label>
                  <select value={state} onChange={e => setState(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', width: '100%' }}>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Zip Code</label>
                  <input value={zipCode} onChange={e => setZipCode(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary">{editCustId ? 'Save Changes' : 'Create Customer'}</button>
                <button type="button" className="btn" onClick={() => setShowCustModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Job Modal */}
      {showJobModal && jobCust && (
        <div className="modal-overlay" onClick={() => setShowJobModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Create Service Job for {jobCust.firstName}</h3>
            <form onSubmit={handleJobSubmit}>
              <div className="input-group">
                <label>Job Title / Type *</label>
                <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Annual Tune-Up, Wheel Truing" autoFocus required />
              </div>
              <div className="input-group">
                <label>Bike Model / Description</label>
                <input value={jobBike} onChange={e => setJobBike(e.target.value)} placeholder="e.g. 2024 Trek Domane SL 6" />
              </div>
              <div className="input-group">
                <label>Estimated Cost ($)</label>
                <input type="number" step="0.01" value={jobCost} onChange={e => setJobCost(e.target.value)} placeholder="150.00" />
              </div>
              <div className="input-group">
                <label>Service Notes</label>
                <textarea value={jobNotes} onChange={e => setJobNotes(e.target.value)} rows="3" placeholder="Customer concerns, specific noises, requested upgrades..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary">Book Job & Open Board</button>
                <button type="button" className="btn" onClick={() => setShowJobModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
