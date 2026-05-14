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
  ────────────────────────────────────────────────────────
  Rear axle:  (58, 232)
  Front axle: (358, 232)   wheelbase = 300px
  BB:         (168, 248)   BB drop = 16px below axle line
  Seat tube:  73.5° — BB(168,248)→seat top(124,106)  rearward lean ✓
  Top tube:   compact/nearly flat: (124,106)→(310,112)
  Head tube:  73°, 38px — top(310,112)→bottom(321,148)
  Fork:       (321,148)→(358,232)  dx=37 dy=84 → 66° — near-vertical ✓
              (fork differs from HT angle by ~7° due to fork rake — correct)
*/

const ANNOTATIONS = {
  seatTubeCT:       { lx: 2,   ly: 96,  ax: 124, ay: 106, side: 'left'  },
  seatTubeCC:       { lx: 2,   ly: 122, ax: 146, ay: 177, side: 'left'  },
  effectiveTopTube: { lx: 326, ly: 82,  ax: 217, ay: 110, side: 'right' },
  stack:            { lx: 326, ly: 108, ax: 310, ay: 112, side: 'right' },
  headTube:         { lx: 326, ly: 134, ax: 316, ay: 130, side: 'right' },
  reach:            { lx: 326, ly: 160, ax: 310, ay: 190, side: 'right' },
  headTubeAngle:    { lx: 326, ly: 186, ax: 321, ay: 148, side: 'right' },
  standOver:        { lx: 326, ly: 212, ax: 230, ay: 178, side: 'right' },
  seatTubeAngle:    { lx: 2,   ly: 218, ax: 158, ay: 240, side: 'left'  },
  bbHeight:         { lx: 2,   ly: 243, ax: 88,  ay: 248, side: 'left'  },
  bbDrop:           { lx: 2,   ly: 265, ax: 93,  ay: 240, side: 'left'  },
  chainstay:        { lx: 2,   ly: 287, ax: 113, ay: 240, side: 'left'  },
  wheelbase:        { lx: 168, ly: 306, ax: 213, ay: 265, side: 'bottom'},
};

/*
  Dimension lines — each one traces the actual geometry it represents.
  All use amber (#f59e0b) since they only appear when that field is active.

  Frame key points:
    BB(168,248)  rear-axle(58,232)  front-axle(358,232)  ground-y=260
    seat-top(124,106)  HT-top(310,112)  HT-bottom(321,148)

  Seat tube unit-perpendicular (for end caps): (0.953, -0.295)  × 7 = (6.7, -2.1)
  Head tube unit-perpendicular:                (-0.957, 0.293)  × 7 = (-6.7,  2.1)
  Chainstay unit-perpendicular:                (0.144, -0.989)  × 7 = (1.0,  -6.9)
*/
const C = '#f59e0b';  // active amber

const DIMENSION_LINES = {
  /* ── seat tube: overlay the actual tube ── */
  seatTubeCC: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      <line x1="168" y1="248" x2="124" y2="106" strokeWidth="3.5" strokeDasharray="7 4" />
      {/* end caps perpendicular to tube */}
      <line x1="161" y1="250" x2="175" y2="246" strokeWidth="2" />
      <line x1="117" y1="108" x2="131" y2="104" strokeWidth="2" />
    </g>
  ),
  seatTubeCT: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      <line x1="168" y1="248" x2="124" y2="106" strokeWidth="3.5" strokeDasharray="7 4" />
      <line x1="161" y1="250" x2="175" y2="246" strokeWidth="2" />
      <line x1="117" y1="108" x2="131" y2="104" strokeWidth="2" />
    </g>
  ),

  /* ── effective top tube: horizontal span at top-tube level ── */
  effectiveTopTube: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      {/* horizontal arrow just above the top tube */}
      <line x1="124" y1="99" x2="310" y2="99" strokeWidth="1.5" strokeDasharray="5 3" />
      <line x1="124" y1="93" x2="124" y2="105" strokeWidth="2" />
      <line x1="310" y1="93" x2="310" y2="105" strokeWidth="2" />
      {/* faint drop lines to frame */}
      <line x1="124" y1="99" x2="124" y2="106" strokeWidth="1" opacity="0.45" />
      <line x1="310" y1="99" x2="310" y2="112" strokeWidth="1" opacity="0.45" />
    </g>
  ),

  /* ── stack: vertical from BB height to HT-top height ── */
  stack: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      {/* faint horizontal guide from BB across to HT-top x */}
      <line x1="168" y1="248" x2="322" y2="248" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      {/* vertical measurement line at x=322 */}
      <line x1="322" y1="112" x2="322" y2="248" strokeWidth="1.5" strokeDasharray="5 3" />
      <line x1="316" y1="112" x2="328" y2="112" strokeWidth="2" />
      <line x1="316" y1="248" x2="328" y2="248" strokeWidth="2" />
    </g>
  ),

  /* ── reach: horizontal from BB-x to HT-top-x at HT-top height ── */
  reach: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      {/* faint vertical guide from BB up to HT-top height */}
      <line x1="168" y1="248" x2="168" y2="112" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      {/* horizontal measurement at HT-top height */}
      <line x1="168" y1="112" x2="310" y2="112" strokeWidth="1.5" strokeDasharray="5 3" />
      <line x1="168" y1="106" x2="168" y2="118" strokeWidth="2" />
      <line x1="310" y1="106" x2="310" y2="118" strokeWidth="2" />
    </g>
  ),

  /* ── stand over: vertical at top-tube midpoint ── */
  standOver: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      <line x1="217" y1="109" x2="217" y2="260" strokeWidth="1.5" strokeDasharray="5 3" />
      <line x1="211" y1="109" x2="223" y2="109" strokeWidth="2" />
      <line x1="211" y1="260" x2="223" y2="260" strokeWidth="2" />
    </g>
  ),

  /* ── head tube: overlay the actual tube ── */
  headTube: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      <line x1="310" y1="112" x2="321" y2="148" strokeWidth="4" strokeDasharray="6 3" />
      {/* perpendicular end caps */}
      <line x1="303" y1="114" x2="317" y2="110" strokeWidth="2" />
      <line x1="314" y1="150" x2="328" y2="146" strokeWidth="2" />
    </g>
  ),

  /* ── head tube angle: arc at HT bottom, horizontal reference ── */
  headTubeAngle: (
    <g stroke={C} fill="none" opacity="0.9">
      <line x1="298" y1="148" x2="348" y2="148" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      {/* arc from horizontal-left (296,148) to along-HT-up (314,124) — spans 73° */}
      <path d="M 296,148 A 25,25 0 0,0 314,124" strokeWidth="2" />
    </g>
  ),

  /* ── seat tube angle: arc at BB, horizontal reference ── */
  seatTubeAngle: (
    <g stroke={C} fill="none" opacity="0.9">
      <line x1="143" y1="248" x2="200" y2="248" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      {/* arc from horizontal-left (143,248) to along-seat-tube-up (161,224) — spans 73° */}
      <path d="M 143,248 A 25,25 0 0,0 161,224" strokeWidth="2" />
    </g>
  ),

  /* ── BB height: ground to BB center ── */
  bbHeight: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      <line x1="85" y1="260" x2="85" y2="248" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="79" y1="260" x2="91" y2="260" strokeWidth="2" />
      <line x1="79" y1="248" x2="91" y2="248" strokeWidth="2" />
    </g>
  ),

  /* ── BB drop: axle-height line down to BB center ── */
  bbDrop: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      {/* faint horizontal at axle height for reference */}
      <line x1="58" y1="232" x2="180" y2="232" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      <line x1="85" y1="232" x2="85" y2="248" strokeWidth="2" strokeDasharray="3 2" />
      <line x1="79" y1="232" x2="91" y2="232" strokeWidth="2" />
      <line x1="79" y1="248" x2="91" y2="248" strokeWidth="2" />
    </g>
  ),

  /* ── chainstay: overlay the actual stay ── */
  chainstay: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      <line x1="168" y1="248" x2="58" y2="232" strokeWidth="3.5" strokeDasharray="7 4" />
      {/* perpendicular end caps */}
      <line x1="169" y1="241" x2="167" y2="255" strokeWidth="2" />
      <line x1="59"  y1="225" x2="57"  y2="239" strokeWidth="2" />
    </g>
  ),

  /* ── wheelbase: between both axles ── */
  wheelbase: (
    <g stroke={C} opacity="0.9" strokeLinecap="round">
      <line x1="58" y1="252" x2="358" y2="252" strokeWidth="1.5" strokeDasharray="5 3" />
      <line x1="58"  y1="246" x2="58"  y2="258" strokeWidth="2" />
      <line x1="358" y1="246" x2="358" y2="258" strokeWidth="2" />
    </g>
  ),
};

function GeometryDiagram({ values, activeField }) {
  return (
    <svg
      viewBox="0 0 500 310"
      xmlns="http://www.w3.org/2000/svg"
      className="geo-diagram"
      aria-label="Frame geometry diagram"
    >
      {/* Axle / ground reference line — always visible */}
      <line x1="30" y1="260" x2="420" y2="260"
            stroke="#334155" strokeWidth="1.5" strokeDasharray="6 4" />

      {/* ── Frame tubes — always visible ── */}
      <line x1="168" y1="248" x2="58"  y2="232" stroke="#64748b" strokeWidth="5"  strokeLinecap="round" />
      <line x1="124" y1="106" x2="58"  y2="232" stroke="#64748b" strokeWidth="3"  strokeLinecap="round" />
      <line x1="168" y1="248" x2="124" y2="106" stroke="#94a3b8" strokeWidth="6"  strokeLinecap="round" />
      <line x1="124" y1="106" x2="310" y2="112" stroke="#94a3b8" strokeWidth="5"  strokeLinecap="round" />
      <line x1="168" y1="248" x2="321" y2="148" stroke="#94a3b8" strokeWidth="7"  strokeLinecap="round" />
      <line x1="310" y1="112" x2="321" y2="148" stroke="#94a3b8" strokeWidth="9"  strokeLinecap="round" />
      <line x1="321" y1="148" x2="358" y2="232" stroke="#64748b" strokeWidth="4"  strokeLinecap="round" />

      {/* Junction dots */}
      <circle cx="168" cy="248" r="6" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
      <circle cx="58"  cy="232" r="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
      <circle cx="358" cy="232" r="4" fill="#1e293b" stroke="#64748b" strokeWidth="2" />

      {/* ── Dimension line: only the active field's line ── */}
      {activeField && DIMENSION_LINES[activeField]}

      {/* ── Annotations: leader line + label only for active field ── */}
      {FIELDS.map(f => {
        const pos = ANNOTATIONS[f.key];
        if (!pos) return null;
        const val = values[f.key];
        const isActive = activeField === f.key;
        const hasVal = val && val !== '';

        if (!isActive) return null;

        const clr = '#f59e0b';
        const labelText = hasVal ? `${f.label}: ${val}${f.unit}` : f.label;
        const lineX1 = pos.side === 'left'  ? pos.lx + 56
                     : pos.side === 'right' ? pos.lx - 4
                     : pos.lx;

        return (
          <g key={f.key}>
            <line
              x1={lineX1} y1={pos.ly}
              x2={pos.ax}  y2={pos.ay}
              stroke={clr} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.9"
            />
            <text
              x={pos.lx} y={pos.ly + 4}
              fill={clr}
              fontSize="9.5"
              fontWeight="700"
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
