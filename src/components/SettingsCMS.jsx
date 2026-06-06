import React, { useState, useEffect } from 'react';

export default function SettingsCMS() {
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    stripeSecretKeyConfigured: false,
    stripeSecretKeyMasked: '',
    stripeWebhookSecretConfigured: false,
    stripeWebhookSecretMasked: '',
    webhookUrl: '',
    isLive: false
  });

  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' or 'error'
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Fetch current settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('mechanic_token') || '';
      const res = await fetch('/api/settings/stripe', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        // Set placeholders/masked keys in input fields
        setStripeSecretKey(data.stripeSecretKeyMasked || '');
        setStripeWebhookSecret(data.stripeWebhookSecretMasked || '');
      } else {
        showMsg('Failed to load settings from server.', 'error');
      }
    } catch (err) {
      showMsg('Network error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const token = sessionStorage.getItem('mechanic_token') || '';
      const res = await fetch('/api/settings/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stripeSecretKey,
          stripeWebhookSecret
        })
      });

      const data = await res.json();
      if (res.ok) {
        showMsg(data.message || 'Settings saved successfully!', 'success');
        fetchSettings(); // Refresh configuration details
      } else {
        showMsg(data.error || 'Failed to save settings.', 'error');
      }
    } catch (err) {
      showMsg('Error saving settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!stripeSecretKey || stripeSecretKey === '') {
      showMsg('Please provide a Stripe Secret Key to test.', 'error');
      return;
    }
    
    setTesting(true);
    setMessage({ text: '', type: '' });

    try {
      const token = sessionStorage.getItem('mechanic_token') || '';
      const res = await fetch('/api/settings/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stripeSecretKey,
          stripeWebhookSecret // Send both to run tests
        })
      });

      const data = await res.json();
      if (res.ok) {
        showMsg('✓ Stripe API Connection verified successfully!', 'success');
      } else {
        showMsg(data.error || 'Stripe API validation failed.', 'error');
      }
    } catch (err) {
      showMsg('Test connection failed: ' + err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMsg('Webhook URL copied to clipboard!', 'success');
  };

  const isMockMode = !config.stripeSecretKeyConfigured;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', color: 'var(--text-main)' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Loading configurations...</p>
      </div>
    );
  }

  return (
    <div className="cms-container settings-area">
      <div className="dash-header" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>⚙️ System Settings</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Configure integrations, Stripe payments, and live workspace settings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Stripe Keys Configuration Form */}
        <div className="card settings-card" style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💳 Stripe Payments Integration
            </h3>
            <span className={`status-badge ${isMockMode ? 'status-planned' : 'status-installed'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.60rem' }}>
              {isMockMode ? '🔌 Simulator Mode' : config.isLive ? '⚡ LIVE Payments' : '🧪 Test Mode (Stripe)'}
            </span>
          </div>

          {message.text && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: message.type === 'success' ? '#34d399' : '#f87171',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="input-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Stripe Secret Key (sk_live_... or sk_test_...)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {config.stripeSecretKeyConfigured ? '✅ Configured' : '❌ Not set'}
                </span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={stripeSecretKey}
                  onChange={e => setStripeSecretKey(e.target.value)}
                  placeholder={config.stripeSecretKeyConfigured ? '••••••••••••••••••••••••' : 'Enter Stripe Secret Key'}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                  title={showSecret ? 'Hide key' : 'Show key'}
                >
                  {showSecret ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Stripe Webhook Signing Secret (whsec_...)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {config.stripeWebhookSecretConfigured ? '✅ Configured' : '❌ Not set'}
                </span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={stripeWebhookSecret}
                  onChange={e => setStripeWebhookSecret(e.target.value)}
                  placeholder={config.stripeWebhookSecretConfigured ? '••••••••••••••••••••••••' : 'Enter Webhook Signing Secret'}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                  title={showWebhookSecret ? 'Hide key' : 'Show key'}
                >
                  {showWebhookSecret ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label>Your Stripe Webhook Endpoint URL</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={config.webhookUrl}
                  readOnly
                  style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)' }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => copyToClipboard(config.webhookUrl)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  📋 Copy
                </button>
              </div>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Configure this URL in Stripe Dashboard Webhooks to listen for <code>invoice.paid</code> events.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ flex: 1 }}
              >
                {saving ? 'Saving...' : '💾 Save Settings'}
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={handleTestConnection}
                disabled={testing}
                style={{ flex: 1 }}
              >
                {testing ? 'Testing...' : '⚡ Test Connection'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Walkthrough / Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--brand-primary)' }}>🚀 Instructions: Going Live</h4>
            <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <li>
                <strong>Retrieve Keys</strong>: Log in to your <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Stripe Dashboard</a>. Go to <strong>Developers &gt; API Keys</strong>.
              </li>
              <li>
                <strong>Toggle Live Mode</strong>: Copy <code>sk_test_...</code> for Stripe sandbox testing (safest) or toggle the <strong>Live Mode</strong> switch to copy your production <code>sk_live_...</code> key for actual money transactions.
              </li>
              <li>
                <strong>Configure Webhook</strong>: In your Stripe Dashboard, go to <strong>Developers &gt; Webhooks</strong>. Click <strong>Add Endpoint</strong>. Paste the webhook URL from the left, select event <code>invoice.paid</code>, and create it.
              </li>
              <li>
                <strong>Add Signing Secret</strong>: Copy the Webhook Signing Secret (starts with <code>whsec_...</code>) and paste it into the Webhook Signing Secret field.
              </li>
              <li>
                <strong>Save & Test</strong>: Click <strong>Save Settings</strong>, then click <strong>Test Connection</strong> to verify alignment. Once saved, the portal immediately uses the real Stripe API!
              </li>
            </ol>
          </div>

          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent)' }}>💻 Local Webhook Routing (For Development)</h4>
            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              If your mechanic portal server is running behind a local Chromebook port (port 3000) and cannot receive public requests directly:
            </p>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-main)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span># Install the Stripe CLI & listen:</span>
              <span style={{ color: 'var(--brand-primary)' }}>stripe login</span>
              <span style={{ color: 'var(--brand-primary)' }}>stripe listen --forward-to localhost:3000/api/webhooks/stripe</span>
              <span style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}># Copy the whsec_... signature from CLI output.</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
