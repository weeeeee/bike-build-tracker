import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, saveGeometry } from '../db/database';

const FIELDS = [
  { key: 'seatTubeCC',      label: 'Seat Tube (c-c)',       unit: 'cm',  desc: 'Center of BB to center of top tube junction' },
  { key: 'seatTubeCT',      label: 'Seat Tube (c-t)',       unit: 'cm',  desc: 'Center of BB to top of seat tube' },
  { key: 'effectiveTopTube', label: 'Effective Top Tube',   unit: 'cm',  desc: 'Horizontal distance from head tube to seat tube' },
  { key: 'stack',           label: 'Stack',                 unit: 'cm',  desc: 'Vertical height from BB center to top of head tube' },
  { key: 'reach',           label: 'Reach',                 unit: 'cm',  desc: 'Horizontal distance from BB center to top of head tube' },
  { key: 'standOver',       label: 'Stand Over',            unit: 'cm',  desc: 'Height from ground to top of top tube at midpoint' },
  { key: 'headTube',        label: 'Head Tube',             unit: 'cm',  desc: 'Length of the head tube' },
  { key: 'headTubeAngle',   label: 'Head Tube Angle',       unit: '°',   desc: 'Angle of head tube from horizontal' },
  { key: 'seatTubeAngle',   label: 'Seat Tube Angle',       unit: '°',   desc: 'Angle of seat tube from horizontal' },
  { key: 'bbHeight',        label: 'BB Height',             unit: 'cm',  desc: 'Height of BB center from the ground' },
  { key: 'bbDrop',          label: 'BB Drop',               unit: 'cm',  desc: 'Distance BB center is below the wheel axle height' },
  { key: 'chainstay',       label: 'Chainstay',             unit: 'cm',  desc: 'Distance from BB center to rear axle center' },
  { key: 'wheelbase',       label: 'Wheelbase',             unit: 'cm',  desc: 'Distance between front and rear axle centers' },
];

const emptyForm = Object.fromEntries(FIELDS.map(f => [f.key, '']));

/*
  Frame anchor points  (viewBox 0 0 500 310)
  ───────────────────────────────────────────
  Both axles:   y=232  (same height — ground reference)
  BB:           (168,248)  BB drop 16px below axle
  Seat tube:    73.5° — top at (124,106)  slightly rearward lean ✓
  Top tube:     compact/nearly flat: (124,106) → (284,112)
  Head tube:    73°, 38px — top(284,112) bottom(295,148)
  Fork:         (295,148) → (378,232)
  Rear axle:    (58,232)   chainstay=(168,248)→(58,232)
  Front axle:   (378,232)  wheelbase=320px
*/

// Label positions: lx/ly = text anchor, ax/ay = frame point the leader line touches
const ANNOTATIONS = {
  seatTubeCT:       { lx: 2,   ly: 96,  ax: 124, ay: 106, side: 'left'  },
  seatTubeCC:       { lx: 2,   ly: 122, ax: 146, ay: 177, side: 'left'  },
  effectiveTopTube: { lx: 306, ly: 82,  ax: 204, ay: 112, side: 'right' },
  stack:            { lx: 306, ly: 108, ax: 284, ay: 112, side: 'right' },
  headTube:         { lx: 306, ly: 134, ax: 290, ay: 130, side: 'right' },
  reach:            { lx: 306, ly: 160, ax: 284, ay: 185, side: 'right' },
  headTubeAngle:    { lx: 306, ly: 186, ax: 295, ay: 148, side: 'right' },
  standOver:        { lx: 306, ly: 212, ax: 220, ay: 175, side: 'right' },
  seatTubeAngle:    { lx: 2,   ly: 218, ax: 158, ay: 240, side: 'left'  },
  bbHeight:         { lx: 2,   ly: 243, ax: 88,  ay: 248, side: 'left'  },
  bbDrop:           { lx: 2,   ly: 265, ax: 93,  ay: 240, side: 'left'  },
  chainstay:        { lx: 2,   ly: 287, ax: 113, ay: 240, side: 'left'  },
  wheelbase:        { lx: 168, ly: 306, ax: 218, ay: 265, side: 'bottom'},
};

function GeometryDiagram({ values, activeField }) {
  return (
    <svg
      viewBox="0 0 500 310"
      xmlns="http://www.w3.org/2000/svg"
      className="geo-diagram"
      aria-label="Frame geometry diagram"
    >
      {/* Ground / axle reference line */}
      <line x1="30" y1="260" x2="420" y2="260" stroke="#334155" strokeWidth="1.5" strokeDasharray="6 4" />

      {/* ── Frame tubes ── */}
      {/* Chainstay: BB(168,248) → rear axle(58,232) — slight upward angle = BB drop */}
      <line x1="168" y1="248" x2="58" y2="232"
            stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
      {/* Seat stay: seat top(124,106) → rear axle(58,232) */}
      <line x1="124" y1="106" x2="58" y2="232"
            stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      {/* Seat tube: BB(168,248) → seat top(124,106) — 73.5°, leans slightly rearward */}
      <line x1="168" y1="248" x2="124" y2="106"
            stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
      {/* Top tube: seat top(124,106) → HT top(284,112) — compact, nearly flat */}
      <line x1="124" y1="106" x2="284" y2="112"
            stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      {/* Down tube: BB(168,248) → HT bottom(295,148) — large aero tube */}
      <line x1="168" y1="248" x2="295" y2="148"
            stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" />
      {/* Head tube: top(284,112) → bottom(295,148) — short, 73° */}
      <line x1="284" y1="112" x2="295" y2="148"
            stroke="#94a3b8" strokeWidth="9" strokeLinecap="round" />
      {/* Fork: HT bottom(295,148) → front axle(378,232) */}
      <line x1="295" y1="148" x2="378" y2="232"
            stroke="#64748b" strokeWidth="4" strokeLinecap="round" />

      {/* Junction dots */}
      <circle cx="168" cy="248" r="6" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="58"  cy="232" r="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
      <circle cx="378" cy="232" r="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />

      {/* ── Dimension reference lines ── */}
      {/* Stack: vertical from BB height up to HT top, right of frame */}
      <line x1="306" y1="248" x2="306" y2="112"
            stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      <line x1="301" y1="248" x2="311" y2="248"
            stroke="#3b82f6" strokeWidth="1.5" opacity="0.5" />
      <line x1="301" y1="112" x2="311" y2="112"
            stroke="#3b82f6" strokeWidth="1.5" opacity="0.5" />
      {/* Reach: horizontal from BB x to HT top x */}
      <line x1="168" y1="190" x2="284" y2="190"
            stroke="#10b981" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      <line x1="168" y1="185" x2="168" y2="195"
            stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
      <line x1="284" y1="185" x2="284" y2="195"
            stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
      {/* BB Drop: vertical from axle line to BB */}
      <line x1="88" y1="232" x2="88" y2="248"
            stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
      <line x1="83" y1="232" x2="93" y2="232"
            stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
      <line x1="83" y1="248" x2="93" y2="248"
            stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
      {/* Wheelbase: between axles just above ground */}
      <line x1="58"  y1="252" x2="378" y2="252"
            stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      <line x1="58"  y1="247" x2="58"  y2="257"
            stroke="#8b5cf6" strokeWidth="1.5" opacity="0.5" />
      <line x1="378" y1="247" x2="378" y2="257"
            stroke="#8b5cf6" strokeWidth="1.5" opacity="0.5" />

      {/* ── Annotations ── */}
      {FIELDS.map(f => {
        const pos = ANNOTATIONS[f.key];
        if (!pos) return null;
        const val = values[f.key];
        const isActive = activeField === f.key;
        const hasVal = val && val !== '';
        const clr = isActive ? '#f59e0b' : hasVal ? '#10b981' : '#475569';
        const labelText = hasVal ? `${f.label}: ${val}${f.unit}` : f.label;
        const lineX1 = pos.side === 'left'   ? pos.lx + 56
                     : pos.side === 'right'  ? pos.lx - 4
                     : pos.lx;

        return (
          <g key={f.key}>
            <line
              x1={lineX1} y1={pos.ly}
              x2={pos.ax}  y2={pos.ay}
              stroke={clr}
              strokeWidth={isActive ? 1.5 : 1}
              strokeDasharray="3 3"
              opacity="0.75"
            />
            <text
              x={pos.lx}
              y={pos.ly + 4}
              fill={clr}
              fontSize={isActive ? "9.5" : "8.5"}
              fontWeight={isActive || hasVal ? "600" : "400"}
              fontFamily="system-ui, sans-serif"
            >
              {labelText}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function GeometryTab({ buildId }) {
  const geo = useLiveQuery(
    () => db.geometry.where('buildId').equals(buildId).first(),
    [buildId]
  );

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    if (geo) {
      setForm(prev => {
        const next = { ...emptyForm };
        FIELDS.forEach(f => { next[f.key] = geo[f.key] ?? ''; });
        return next;
      });
    }
  }, [geo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await saveGeometry(buildId, form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const filledCount = FIELDS.filter(f => form[f.key] !== '').length;

  return (
    <div className="geo-layout">
      <div className="geo-form-col">
        <div className="geo-form-header">
          <h3 className="geo-form-title">Frame Geometry</h3>
          <span className="geo-progress-text">{filledCount} / {FIELDS.length} filled</span>
        </div>

        <form className="geo-form" onSubmit={handleSave}>
          <div className="geo-fields">
            {FIELDS.map(f => (
              <div
                key={f.key}
                className={`geo-field${activeField === f.key ? ' active' : ''}${form[f.key] ? ' filled' : ''}`}
                onMouseEnter={() => setActiveField(f.key)}
                onMouseLeave={() => setActiveField(null)}
              >
                <label className="geo-label" htmlFor={`geo-${f.key}`}>
                  <span className="geo-label-name">{f.label}</span>
                  <span className="geo-label-unit">{f.unit}</span>
                </label>
                <input
                  id={`geo-${f.key}`}
                  name={f.key}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form[f.key]}
                  onChange={handleChange}
                  onFocus={() => setActiveField(f.key)}
                  onBlur={() => setActiveField(null)}
                  placeholder={f.unit === '°' ? '73.0' : '0.0'}
                  className="geo-input"
                />
                <span className="geo-desc">{f.desc}</span>
              </div>
            ))}
          </div>

          <div className="geo-form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Geometry'}
            </button>
          </div>
        </form>

        <p className="geo-reference-link">
          Reference measurements at{' '}
          <a href="https://bikeinsights.com" target="_blank" rel="noopener noreferrer">
            bikeinsights.com
          </a>
        </p>
      </div>

      <div className="geo-diagram-col">
        <div className="geo-diagram-wrap">
          <GeometryDiagram values={form} activeField={activeField} />
          {filledCount === 0 && (
            <p className="geo-diagram-hint">Hover a field to highlight it on the diagram</p>
          )}
        </div>
      </div>
    </div>
  );
}
