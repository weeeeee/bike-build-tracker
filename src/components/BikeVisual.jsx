import { COMPONENT_TYPES } from '../db/database';

/*
  Racing road bike geometry  (viewBox 0 0 680 480)
  ─────────────────────────────────────────────────
  Rear hub  : (148, 376)   r=80  (23 mm tire profile)
  Front hub : (408, 376)   r=80
  Wheelbase : 260 px  =  1.63 × wheel diameter  ← real road-bike ratio
  BB        : (282, 384)
  Seat-tube top : (249, 238)   ~74 ° angle
  Head-tube top : (382, 214)   bottom: (385, 253)  short HT = aggressive fit
  Fork rake : 22 px  →  very direct handling feel
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
  installed:'drop-shadow(0 0 7px #10b981)',
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

  /* ── spokes: 16 thin bladed spokes for a race wheel ── */
  const spokes = (count, r) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i * Math.PI * 2) / count;
      return (
        <line key={i} x1="0" y1="0"
          x2={Math.cos(a) * r} y2={Math.sin(a) * r}
          stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      );
    });

  /* ── deep-section racing wheel (carbon clincher look) ── */
  const racingWheel = (type) => (
    <g className={`wheel-spin${isComplete ? ' active' : ''}`}
       style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      {/* Thin 23 mm tire */}
      <circle r="80" fill="none" strokeWidth="5"
              stroke={color(type)} style={{ filter: glow(type) }} />
      {/* Deep-section rim body — thick ring gives carbon rim depth */}
      <circle r="70" fill="none" strokeWidth="17"
              stroke={color(type)} opacity="0.55" />
      {/* Rim bed / brake track edge */}
      <circle r="61" fill="none" strokeWidth="1.5"
              stroke={color(type)} opacity="0.4" />
      {/* 16 spokes */}
      <g stroke={color(type)}>{spokes(16, 60)}</g>
      {/* Hub shell */}
      <circle r="9"  fill={color(type)} />
      <circle r="4"  fill="#0f172a" />
    </g>
  );

  return (
    <div className={`bike-visual-wrap ${isComplete ? 'complete' : ''}`}>
      <div className="bike-visual-label">
        {isComplete
          ? <span className="ready-label">READY TO RIDE! 🚲</span>
          : <span>{filledCount} / {COMPONENT_TYPES.length} components added</span>}
      </div>

      <svg viewBox="0 0 680 480" className="bike-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="gShadow" cx="50%" cy="10%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="285" cy="468" rx="232" ry="8" fill="url(#gShadow)" />

        {/* ══════════════════════════════════════════
            WHOLE BIKE — bobs when all parts filled
        ══════════════════════════════════════════ */}
        <g className={`bike-all${isComplete ? ' riding' : ''}`}>

          {/* ─── REAR WHEEL  hub: (148, 376) ─── */}
          <g transform="translate(148, 376)">
            {racingWheel('wheelset')}

            {/* Cassette — stacked sprockets */}
            <g style={{ color: color('cassette'), filter: glow('cassette') }}>
              {[24, 19, 15, 12, 9].map((r, i) => (
                <circle key={i} r={r}
                  fill={i === 0 ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={i === 0 ? 0 : 1.8}
                  opacity={i === 0 ? 1 : 0.85} />
              ))}
              {/* Sprocket teeth on largest ring */}
              {Array.from({ length: 14 }, (_, i) => {
                const a = (i * Math.PI * 2) / 14;
                return <line key={i}
                  x1={Math.cos(a) * 24} y1={Math.sin(a) * 24}
                  x2={Math.cos(a) * 28} y2={Math.sin(a) * 28}
                  stroke="currentColor" strokeWidth="2.5" />;
              })}
            </g>

            {/* Rear derailleur — parallelogram cage */}
            <g style={{ color: color('rearDerailleur'), filter: glow('rearDerailleur') }}>
              {/* B-knuckle arm */}
              <path d="M18,22 L6,44 L14,61" fill="none" stroke="currentColor"
                    strokeWidth="3.5" strokeLinecap="round" />
              {/* Upper pulley */}
              <circle cx="6"  cy="44" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5"/>
              <circle cx="6"  cy="44" r="2.5" fill="currentColor" />
              {/* Lower pulley */}
              <circle cx="14" cy="61" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5"/>
              <circle cx="14" cy="61" r="2.5" fill="currentColor" />
              {/* Cage plate */}
              <path d="M0,40 L8,57" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              {/* Pivot bolt */}
              <circle cx="18" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
            </g>

            {/* Rear brake caliper */}
            <g style={{ color: color('levers'), filter: glow('levers') }}>
              <rect x="-7" y="-92" width="14" height="10" rx="2"
                    fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="0" y1="-82" x2="-8" y2="-74"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="-82" x2="8" y2="-74"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>

          {/* ─── FRONT WHEEL  hub: (408, 376) ─── */}
          <g transform="translate(408, 376)">
            {racingWheel('wheelset')}

            {/* Front brake caliper */}
            <g style={{ color: color('levers'), filter: glow('levers') }}>
              <rect x="-7" y="-92" width="14" height="10" rx="2"
                    fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="0" y1="-82" x2="-8" y2="-74"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="0" y1="-82" x2="8" y2="-74"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>

          {/* ─── FRAME — carbon race geometry ─── */}
          <g style={{ color: color('frame'), filter: glow('frame') }}>
            {/* Down tube (large aero tube): HT-bottom(385,253) → BB(282,384) */}
            <path d="M385,253 L282,384"
                  fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
            {/* Top tube (slightly sloped): seat-top(249,238) → HT-top(382,214) */}
            <path d="M249,238 L382,214"
                  fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
            {/* Seat tube: BB(282,384) → seat-top(249,238) */}
            <path d="M282,384 L249,238"
                  fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
            {/* Chain stays (thin): BB(282,384) → rear-dropout(148,376) */}
            <path d="M282,384 Q215,386 148,376"
                  fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            {/* Seat stays (very thin): seat-top(249,238) → rear-dropout(148,376) */}
            <path d="M249,238 L148,376"
                  fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            {/* Head tube — short for aggressive fit */}
            <rect x="379" y="207" width="13" height="48" rx="5" fill="currentColor" />
            {/* BB shell */}
            <ellipse cx="282" cy="384" rx="9" ry="7" fill="currentColor" />
          </g>

          {/* ─── FORK (carbon tapered) ─── */}
          <g style={{ color: color('fork'), filter: glow('fork') }}>
            {/* Crown area — wider */}
            <path d="M381,253 Q390,295 408,376"
                  fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
            {/* Second blade (fork pair depth) */}
            <path d="M388,253 Q396,295 413,376"
                  fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
            {/* Fork crown detail */}
            <path d="M378,255 L392,255" stroke="currentColor" strokeWidth="6"
                  strokeLinecap="round" opacity="0.7" />
          </g>

          {/* ─── SEAT POST ─── */}
          <g style={{ color: color('seatPost'), filter: glow('seatPost') }}>
            <path d="M249,238 L245,186"
                  fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            {/* Clamp ring at top of seat tube */}
            <rect x="243" y="234" width="12" height="7" rx="3" fill="currentColor" opacity="0.8" />
          </g>

          {/* ─── SEAT (narrow racing saddle) ─── */}
          <g style={{ color: color('seat'), filter: glow('seat') }}>
            {/* Main saddle — narrow, elongated */}
            <path d="M218,183 Q228,172 244,175 Q258,172 266,183 Q258,188 244,187 Q228,188 218,183 Z"
                  fill="currentColor" />
            {/* Saddle nose taper */}
            <path d="M218,183 Q214,182 213,180 Q214,178 218,179"
                  fill="currentColor" />
            {/* Saddle rails (thin lines under) */}
            <line x1="222" y1="188" x2="244" y2="188"
                  stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
            <line x1="244" y1="188" x2="264" y2="185"
                  stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          </g>

          {/* ─── STEM (short aero stem) ─── */}
          <g style={{ color: color('stem'), filter: glow('stem') }}>
            <path d="M382,214 L403,194"
                  fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            {/* Stem face plate */}
            <rect x="399" y="188" width="10" height="12" rx="2" fill="currentColor" />
          </g>

          {/* ─── HANDLEBARS (compact road drop bars) ─── */}
          <g style={{ color: color('handlebars'), filter: glow('handlebars') }}>
            {/* Bar top across stem clamp */}
            <path d="M390,192 L416,192"
                  fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            {/* Right drop — curving down and back in */}
            <path d="M416,192 Q428,192 428,205 Q428,224 412,226"
                  fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
            {/* Left shoulder hint */}
            <path d="M390,192 Q384,192 384,199"
                  fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
            {/* Bar tape wrapping lines */}
            {[195, 200, 205, 210, 215, 220].map(y => (
              <line key={y} x1="411" y1={y} x2="415" y2={y+2}
                    stroke="currentColor" strokeWidth="1" opacity="0.3" />
            ))}
          </g>

          {/* ─── LEVERS (STI brake/shift lever hoods) ─── */}
          <g style={{ color: color('levers'), filter: glow('levers') }}>
            {/* Hood body — ergonomic tear-drop */}
            <path d="M413,184 Q417,178 423,180 Q428,183 427,192 Q425,199 419,201 Q414,200 413,193 Z"
                  fill="currentColor" />
            {/* Lever blade */}
            <path d="M421,198 Q424,210 419,217"
                  fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            {/* Hood texture line */}
            <path d="M415,187 Q420,183 425,185"
                  fill="none" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" opacity="0.4" />
          </g>

          {/* ─── HEADSET ─── */}
          <g style={{ color: color('headset'), filter: glow('headset') }}>
            <rect x="376" y="205" width="20" height="7" rx="3" fill="currentColor" />
            <rect x="377" y="248" width="20" height="7" rx="3" fill="currentColor" />
          </g>

          {/* ─── BOTTOM BRACKET ─── */}
          <g style={{ color: color('bottomBracket'), filter: glow('bottomBracket') }}>
            <circle cx="282" cy="384" r="14" fill="currentColor" />
            <circle cx="282" cy="384" r="9"  fill="none" stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="282" cy="384" r="4"  fill="#0f172a" />
          </g>

          {/* ─── CRANK + DOUBLE CHAINRING ─── */}
          <g style={{ color: color('crank'), filter: glow('crank') }}>
            {/* Right crank arm (shown, pointing down-forward) */}
            <path d="M282,384 L288,436"
                  fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            {/* Clipless pedal */}
            <rect x="278" y="433" width="28" height="7" rx="3" fill="currentColor" />
            <line x1="279" y1="436" x2="305" y2="437"
                  stroke="#0f172a" strokeWidth="1" opacity="0.4" />

            {/* Outer chainring (large ring) */}
            <circle cx="282" cy="384" r="40"
                    fill="none" stroke="currentColor" strokeWidth="5" />
            {/* Inner chainring (small ring — road double) */}
            <circle cx="282" cy="384" r="27"
                    fill="none" stroke="currentColor" strokeWidth="3.5" opacity="0.7" />
            {/* Chainring arm spiders (4 arms) */}
            {[45, 135, 225, 315].map(deg => {
              const a = deg * Math.PI / 180;
              return <line key={deg}
                x1={282 + Math.cos(a) * 14} y1={384 + Math.sin(a) * 14}
                x2={282 + Math.cos(a) * 38} y2={384 + Math.sin(a) * 38}
                stroke="currentColor" strokeWidth="5" strokeLinecap="round" />;
            })}
            {/* Outer ring teeth */}
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * Math.PI * 2) / 24;
              return <line key={i}
                x1={282 + Math.cos(a) * 40} y1={384 + Math.sin(a) * 40}
                x2={282 + Math.cos(a) * 45} y2={384 + Math.sin(a) * 45}
                stroke="currentColor" strokeWidth="2.5" />;
            })}
          </g>

          {/* ─── CHAIN ─── */}
          <g style={{ color: color('chain'), filter: glow('chain') }}>
            {/* Top run: chainring → cassette */}
            <path d="M282,344 L148,356"
                  fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5,3" />
            {/* Bottom run */}
            <path d="M282,424 L148,412"
                  fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5,3" />
          </g>

          {/* ─── FRONT DERAILLEUR ─── */}
          <g style={{ color: color('frontDerailleur'), filter: glow('frontDerailleur') }}>
            {/* Cage */}
            <path d="M289,349 L307,349 L307,373 L289,373 Z"
                  fill="none" stroke="currentColor" strokeWidth="2.5" />
            {/* Clamp band on seat tube */}
            <path d="M278,344 Q282,341 286,344"
                  fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            {/* Linkage arm */}
            <path d="M284,344 L289,349"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* ─── CABLE ROUTING (thin lines for realism) ─── */}
          <g opacity="0.25" stroke={color('levers')} fill="none" strokeWidth="1.2">
            {/* Brake cable: lever → front brake */}
            <path d="M419,205 Q430,240 415,295 Q412,335 408,376"
                  strokeDasharray="3,3" />
            {/* Shift cable: lever → rear derailleur */}
            <path d="M413,200 Q390,230 340,260 Q260,295 210,330 Q175,355 148,376"
                  strokeDasharray="3,3" />
          </g>

        </g>{/* end .bike-all */}
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
