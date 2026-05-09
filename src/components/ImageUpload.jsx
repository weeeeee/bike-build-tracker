import { useState } from 'react';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_IMAGES = 8;

export default function ImageUpload({ values = [], onChange }) {
  const [mode, setMode] = useState('file');
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');

  const add = (url) => {
    if (values.length >= MAX_IMAGES) {
      setError(`Max ${MAX_IMAGES} images`);
      return;
    }
    onChange([...values, url]);
    setError('');
  };

  const remove = (idx) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const handleFile = (e) => {
    const files = Array.from(e.target.files);
    const remaining = MAX_IMAGES - values.length;
    if (files.length > remaining) {
      setError(`Only ${remaining} more image${remaining !== 1 ? 's' : ''} allowed`);
    }
    files.slice(0, remaining).forEach(file => {
      if (file.size > MAX_SIZE) {
        setError(`"${file.name}" exceeds 2 MB limit`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => add(ev.target.result);
      reader.readAsDataURL(file);
    });
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const handleUrl = () => {
    const url = urlInput.trim();
    if (url) {
      add(url);
      setUrlInput('');
    }
  };

  return (
    <div className="img-gallery">
      {/* Existing images */}
      {values.length > 0 && (
        <div className="img-gallery-grid">
          {values.map((url, idx) => (
            <div key={idx} className="img-gallery-item">
              <img src={url} alt={`Image ${idx + 1}`} />
              <button
                type="button"
                className="img-gallery-remove"
                onClick={() => remove(idx)}
                title="Remove"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add more */}
      {values.length < MAX_IMAGES && (
        <div className="img-add-area">
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
              multiple
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
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleUrl())}
              />
              <button type="button" className="btn" onClick={handleUrl}>Add</button>
            </div>
          )}
        </div>
      )}

      {error && <p className="input-error">{error}</p>}
      {values.length > 0 && (
        <p className="img-gallery-count">{values.length} / {MAX_IMAGES} images</p>
      )}
    </div>
  );
}
