import { COMPONENT_TYPES } from '../db/database';

/*
  Geometry reference (viewBox 0 0 680 480):
  - Rear wheel hub:  (148, 378)  r=82
  - Front wheel hub: (408, 378)  r=82
  - Wheelbase: 260px = 1.58× wheel diameter  ← realistic road bike proportion
  - BB:              (282, 383)
  - Seat tube top:   (238, 238)
  - Head tube top:   (378, 208)  bottom: (381, 256)
  - Fork: HT-bottom → front hub, gentle forward rake
*/

const STATUS_COLORS = {
  empty:    '#1e293b',
  planned:  '#475569',
  ordered:  '#d97706',
  received: '#2563eb',
  installed:'#059669',
};

const STATUS_GLOW = {
  empty:    'none',
  planned:  'none',
  ordered:  'drop-shadow(0 0 4px #f59e0b)',
  received: 'drop-shadow(0 0 5px #3b82f6)',
  installed:'drop-shadow(0 0 6px #10b981)',
};

export default function BikeVisual({ components = [] }) {
  const getState = (type) => {
    const comp = components.find(c => c.type === type);
    if (!comp || !comp.name?.trim()) return 'empty';
    return comp.status || 'planned';
  };

  const color = (type) => STATUS_COLORS[getState(type)];
  const glow  = (type) => STATUS_GLOW[getState(type)];

  const isComplete = COMPONENT_TYPES.every(type => {
    const comp = components.find(c => c.type === type);
    return comp && comp.name?.trim();
  });

  const filledCount = components.filter(c => c.name?.trim()).length;

  const spokes = (count, r) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i * Math.PI * 2) / count;
      return (
        <line key={i} x1="0" y1="0"
          x2={Math.cos(a) * r} y2={Math.sin(a) * r}
          stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      );
    });

  const wheel = (type) => (
    <g className={`wheel-spin${isComplete ? ' active' : ''}`}
       style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <circle r="82" fill="none" strokeWidth="10" stroke={color(type)} style={{ filter: glow(type) }} />
      <circle r="69" fill="none" strokeWidth="2" stroke={color(type)} opacity="0.3" />
      <g stroke={color(type)}>{spokes(18, 81)}</g>
      <circle r="8" fill={color(type)} />
    </g>
  );

  return (
    <div className={`bike-visual-wrap ${isComplete ? 'complete' : ''}`}>
      <div className="bike-visual-label">
        {isComplete ? (
          <span className="ready-label">READY TO RIDE! 🚲</span>
        ) : (
          <span>{filledCount} / {COMPONENT_TYPES.length} components added</span>
        )}
      </div>

      <svg viewBox="0 0 680 480" className="bike-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="gShadow" cx="50%" cy="0%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ground shadow — stays fixed, outside the bob group */}
        <ellipse cx="288" cy="470" rx="238" ry="9" fill="url(#gShadow)" />

        {/* ══ WHOLE BIKE — bobs when complete ══ */}
        <g className={`bike-all${isComplete ? ' riding' : ''}`}>

          {/* ── REAR WHEEL  hub at (148, 378) ── */}
          <g transform="translate(148, 378)">
            {wheel('wheelset')}

            {/* Cassette */}
            <g style={{ color: color('cassette'), filter: glow('cassette') }}>
              {[26, 21, 17, 13, 9].map((r, i) => (
                <circle key={i} r={r}
                  fill={i === 0 ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth={i === 0 ? 0 : 1.5} />
              ))}
              {Array.from({ length: 16 }, (_, i) => {
                const a = (i * Math.PI * 2) / 16;
                return <line key={i}
                  x1={Math.cos(a) * 26} y1={Math.sin(a) * 26}
                  x2={Math.cos(a) * 30} y2={Math.sin(a) * 30}
                  stroke="currentColor" strokeWidth="2.5" />;
              })}
            </g>

            {/* Rear derailleur */}
            <g style={{ color: color('rearDerailleur'), filter: glow('rearDerailleur') }}>
              <path d="M20,24 L7,48 L16,65" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="7" cy="48" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="16" cy="65" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <line x1="14" y1="20" x2="23" y2="30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>

          {/* ── FRONT WHEEL  hub at (408, 378) ── */}
          <g transform="translate(408, 378)">
            {wheel('wheelset')}
          </g>

          {/* ── FRAME ── */}
          <g style={{ color: color('frame'), filter: glow('frame') }}>
            {/* Down tube: HT-bottom(381,256) → BB(282,383) */}
            <path d="M381,256 L282,383" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
            {/* Top tube: seat-top(238,238) → HT-top(378,208) */}
            <path d="M238,238 L378,208" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
            {/* Seat tube: BB(282,383) → seat-top(238,238) */}
            <path d="M282,383 L238,238" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
            {/* Chain stay: BB(282,383) → rear-dropout(148,378) */}
            <path d="M282,383 L148,378" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
            {/* Seat stay: seat-top(238,238) → rear-dropout(148,378) */}
            <path d="M238,238 L148,378" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
            {/* Head tube */}
            <rect x="373" y="201" width="14" height="58" rx="5" fill="currentColor" />
          </g>

          {/* ── FORK ── */}
          <g style={{ color: color('fork'), filter: glow('fork') }}>
            {/* Main blade: HT-bottom(378,256) → front-dropout(408,378) */}
            <path d="M375,256 L408,378" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
            {/* Second blade (slight offset for depth) */}
            <path d="M383,256 L414,378" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.45" />
          </g>

          {/* ── SEAT POST ── */}
          <g style={{ color: color('seatPost'), filter: glow('seatPost') }}>
            <path d="M238,238 L234,188" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
          </g>

          {/* ── SEAT ── */}
          <g style={{ color: color('seat'), filter: glow('seat') }}>
            <path d="M204,184 Q219,170 234,176 Q249,170 264,184 Q248,193 234,191 Q219,193 204,184 Z" fill="currentColor" />
            <line x1="214" y1="190" x2="234" y2="191" stroke="currentColor" strokeWidth="2" opacity="0.55" />
          </g>

          {/* ── STEM ── */}
          <g style={{ color: color('stem'), filter: glow('stem') }}>
            <path d="M378,208 L397,188" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          </g>

          {/* ── HANDLEBARS (drop bar) ── */}
          <g style={{ color: color('handlebars'), filter: glow('handlebars') }}>
            {/* Top bar */}
            <path d="M385,185 L412,185" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
            {/* Right drop */}
            <path d="M412,185 Q424,185 424,199 Q424,219 406,219"
              fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </g>

          {/* ── LEVERS ── */}
          <g style={{ color: color('levers'), filter: glow('levers') }}>
            {/* Hood body */}
            <path d="M408,179 Q413,174 419,177 Q423,180 421,188 Q419,194 414,195 Q409,194 408,188 Z"
              fill="currentColor" />
            {/* Lever blade */}
            <path d="M415,192 Q417,203 413,209"
              fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          </g>

          {/* ── HEADSET ── */}
          <g style={{ color: color('headset'), filter: glow('headset') }}>
            <rect x="370" y="199" width="19" height="7" rx="3" fill="currentColor" />
            <rect x="371" y="252" width="19" height="7" rx="3" fill="currentColor" />
          </g>

          {/* ── BOTTOM BRACKET ── */}
          <g style={{ color: color('bottomBracket'), filter: glow('bottomBracket') }}>
            <circle cx="282" cy="383" r="15" fill="currentColor" />
            <circle cx="282" cy="383" r="10" fill="none" stroke="#0f172a" strokeWidth="2" />
            <circle cx="282" cy="383" r="4" fill="#0f172a" />
          </g>

          {/* ── CRANK + CHAINRING ── */}
          <g style={{ color: color('crank'), filter: glow('crank') }}>
            <path d="M282,383 L287,436" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            <rect x="274" y="433" width="27" height="8" rx="3" fill="currentColor" />
            <circle cx="282" cy="383" r="38" fill="none" stroke="currentColor" strokeWidth="5" />
            <circle cx="282" cy="383" r="30" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            {Array.from({ length: 22 }, (_, i) => {
              const a = (i * Math.PI * 2) / 22;
              return <line key={i}
                x1={282 + Math.cos(a) * 38} y1={383 + Math.sin(a) * 38}
                x2={282 + Math.cos(a) * 43} y2={383 + Math.sin(a) * 43}
                stroke="currentColor" strokeWidth="2.5" />;
            })}
          </g>

          {/* ── CHAIN ── */}
          <g style={{ color: color('chain'), filter: glow('chain') }}>
            <path d="M282,345 L148,357" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5,3" />
            <path d="M282,421 L148,409" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5,3" />
          </g>

          {/* ── FRONT DERAILLEUR ── */}
          <g style={{ color: color('frontDerailleur'), filter: glow('frontDerailleur') }}>
            <rect x="288" y="348" width="18" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M292,348 L292,339" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M302,348 L302,339" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </g>

        </g>{/* ── end .bike-all ── */}
      </svg>

      {/* Legend */}
      <div className="bike-legend">
        {[
          { state: 'empty',    label: 'Not added' },
          { state: 'planned',  label: 'Planned' },
          { state: 'ordered',  label: 'Ordered' },
          { state: 'received', label: 'Received' },
          { state: 'installed',label: 'Installed' },
        ].map(({ state, label }) => (
          <span key={state} className="legend-item">
            <span className="legend-dot" style={{ background: STATUS_COLORS[state] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
