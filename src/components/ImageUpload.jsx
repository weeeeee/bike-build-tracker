import React, { useState } from 'react';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export default function ImageUpload({ value, onChange }) {
  const [mode, setMode] = useState('file');
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setError('Image must be under 2 MB');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUrl = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setError('');
    }
  };

  const clear = () => {
    onChange('');
    setUrlInput('');
    setError('');
  };

  return (
    <div className="image-upload">
      <div className="image-upload-tabs">
        <button
          type="button"
          className={`img-tab${mode === 'file' ? ' active' : ''}`}
          onClick={() => setMode('file')}
        >Upload File</button>
        <button
          type="button"
          className={`img-tab${mode === 'url' ? ' active' : ''}`}
          onClick={() => setMode('url')}
        >Image URL</button>
      </div>

      {mode === 'file' ? (
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="file-input"
        />
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://..."
            onKeyDown={e => e.key === 'Enter' && handleUrl()}
          />
          <button type="button" className="btn" onClick={handleUrl}>Set</button>
        </div>
      )}

      {error && <p className="input-error">{error}</p>}

      {value && (
        <div className="image-preview">
          <img src={value} alt="Component" />
          <button type="button" className="btn btn-danger img-clear" onClick={clear}>✕ Remove</button>
        </div>
      )}
    </div>
  );
}
