import React, { useState, useEffect } from 'react';
import './App.css';
import BikeVisualizer from './components/BikeVisualizer';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [builds, setBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuilds();
  }, []);

  const fetchBuilds = async () => {
    try {
      const res = await fetch(`${API_BASE}/builds`);
      const data = await res.json();
      setBuilds(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching builds:', err);
    }
  };

  const createBuild = async () => {
    const name = prompt('Enter build name:');
    if (!name) return;

    try {
      const res = await fetch(`${API_BASE}/builds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      fetchBuilds();
      loadBuildDetails(data.id);
    } catch (err) {
      console.error('Error creating build:', err);
    }
  };

  const loadBuildDetails = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/builds/${id}`);
      const data = await res.json();
      setSelectedBuild(data);
    } catch (err) {
      console.error('Error loading build details:', err);
    }
  };

  const updateComponent = async (compId, formData) => {
    try {
      const res = await fetch(`${API_BASE}/components/${compId}`, {
        method: 'PUT',
        body: formData // multipart/form-data for image upload
      });
      if (res.ok) {
        loadBuildDetails(selectedBuild.id);
      }
    } catch (err) {
      console.error('Error updating component:', err);
    }
  };

  const handleComponentChange = (compId, field, value) => {
    // Optimistic update or just wait for submission
  };

  const isBuildComplete = () => {
    if (!selectedBuild) return false;
    return selectedBuild.components.every(c => c.name && c.name.trim() !== '');
  };

  const calculateTotal = () => {
    if (!selectedBuild) return 0;
    return selectedBuild.components.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <header>
        <h1>BikeBuild.ai</h1>
        {!selectedBuild ? (
          <button className="btn btn-primary" onClick={createBuild}>+ New Build</button>
        ) : (
          <button className="btn btn-primary" onClick={() => setSelectedBuild(null)}>Back to List</button>
        )}
      </header>

      {!selectedBuild ? (
        <div className="build-grid">
          {builds.map(build => (
            <div key={build.id} className="build-card" onClick={() => loadBuildDetails(build.id)}>
              <h3>{build.name}</h3>
              <p>{new Date(build.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="build-details">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{selectedBuild.name}</h2>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              Total: ${calculateTotal().toFixed(2)}
            </div>
          </div>

          <div className="form-container">
            <div className="component-section">
              {selectedBuild.components.map(comp => (
                <ComponentCard 
                  key={comp.id} 
                  component={comp} 
                  onUpdate={(formData) => updateComponent(comp.id, formData)} 
                />
              ))}
            </div>
          </div>

          <BikeVisualizer 
            components={selectedBuild.components} 
            isComplete={isBuildComplete()} 
          />
        </div>
      )}
    </div>
  );
}

function ComponentCard({ component, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState({ ...component });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocalData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', localData.name || '');
    formData.append('price', localData.price || 0);
    formData.append('description', localData.description || '');
    formData.append('notes', localData.notes || '');
    formData.append('is_ordered', localData.is_ordered);
    if (e.target.image.files[0]) {
      formData.append('image', e.target.image.files[0]);
    }
    onUpdate(formData);
    setIsEditing(false);
  };

  return (
    <div className={`component-card ${component.name ? 'filled' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h4 style={{ textTransform: 'capitalize', margin: 0 }}>{component.type.replace('-', ' ')}</h4>
        <button className="btn" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : (component.name ? 'Edit' : 'Add')}
        </button>
      </div>

      {!isEditing ? (
        <div style={{ marginTop: '1rem' }}>
          {component.name ? (
            <>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{component.name}</div>
              <div style={{ color: 'var(--text-muted)' }}>${component.price || 0}</div>
              {component.is_ordered ? 
                <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>✓ Ordered</span> : 
                <span style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>○ Planned</span>
              }
              {component.image_url && (
                <img src={`http://localhost:3001${component.image_url}`} alt={component.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.5rem', marginTop: '0.5rem' }} />
              )}
            </>
          ) : (
            <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No data entered</div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
          <div className="input-group">
            <label>Name</label>
            <input name="name" value={localData.name || ''} onChange={handleChange} placeholder="e.g. Shimano Ultegra" />
          </div>
          <div className="input-group">
            <label>Price ($)</label>
            <input name="price" type="number" value={localData.price || 0} onChange={handleChange} />
          </div>
          <div className="input-group">
            <label>Description</label>
            <textarea name="description" value={localData.description || ''} onChange={handleChange} rows="2" />
          </div>
          <div className="input-group">
            <label>Notes</label>
            <textarea name="notes" value={localData.notes || ''} onChange={handleChange} rows="2" />
          </div>
          <div className="input-group">
            <label>Image</label>
            <input name="image" type="file" accept="image/*" />
          </div>
          <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input name="is_ordered" type="checkbox" checked={localData.is_ordered} onChange={handleChange} style={{ width: 'auto' }} />
            <label style={{ marginBottom: 0 }}>Ordered?</label>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save</button>
        </form>
      )}
    </div>
  );
}

export default App;
