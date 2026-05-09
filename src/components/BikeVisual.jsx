import React, { useEffect, useRef } from 'react';
import { COMPONENT_TYPES } from '../db/database';

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
  const prevFilledRef = useRef(new Set());

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

  // Spokes helper
  const spokes = (count, r) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i * Math.PI * 2) / count;
      return (
        <line
          key={i}
          x1="0" y1="0"
          x2={Math.cos(a) * r}
          y2={Math.sin(a) * r}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.45"
        />
      );
    });

  return (
    <div className={`bike-visual-wrap ${isComplete ? 'complete' : ''}`}>
      <div className="bike-visual-label">
        {isComplete ? (
          <span className="ready-label">READY TO RIDE! 🚲</span>
        ) : (
          <span>{filledCount} / 14 components added</span>
        )}
      </div>

      <svg
        viewBox="0 0 900 500"
        className="bike-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Ground shadow ── */}
        <defs>
          <radialGradient id="gShadow" cx="50%" cy="0%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.35)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <ellipse cx="445" cy="488" rx="290" ry="10" fill="url(#gShadow)" />

        {/* ══════════════════════════════════════════
            OUTER GROUP — whole bike bobs when riding
        ══════════════════════════════════════════ */}
        <g className={`bike-all${isComplete ? ' riding' : ''}`}>

          {/* ── REAR WHEEL (translate to hub center) ── */}
          <g transform="translate(210, 395)">
            {/* Spinning inner group — transform-box + transform-origin: center for SVG */}
            <g
              className={`wheel-spin${isComplete ? ' active' : ''}`}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              {/* Outer rim */}
              <circle r="88" fill="none" strokeWidth="11"
                stroke={color('wheelset')} style={{ filter: glow('wheelset') }} />
              {/* Inner rim band */}
              <circle r="74" fill="none" strokeWidth="2.5"
                stroke={color('wheelset')} opacity="0.35" />
              {/* Spokes */}
              <g stroke={color('wheelset')}>{spokes(18, 87)}</g>
              {/* Hub */}
              <circle r="9" fill={color('wheelset')} />
            </g>

            {/* Cassette — sits on hub, does NOT spin visually for clarity */}
            <g style={{ color: color('cassette'), filter: glow('cassette') }}>
              {[30, 24, 19, 15, 11].map((r, i) => (
                <circle key={i} r={r}
                  fill={i === 0 ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={i === 0 ? 0 : 1.5} />
              ))}
              {/* Sprocket teeth on outermost ring */}
              {Array.from({ length: 18 }, (_, i) => {
                const a = (i * Math.PI * 2) / 18;
                return (
                  <line key={i}
                    x1={Math.cos(a) * 30} y1={Math.sin(a) * 30}
                    x2={Math.cos(a) * 34} y2={Math.sin(a) * 34}
                    stroke="currentColor" strokeWidth="2.5" />
                );
              })}
            </g>

            {/* Rear derailleur */}
            <g style={{ color: color('rearDerailleur'), filter: glow('rearDerailleur') }}>
              <path d="M22,28 L8,54 L18,73" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="8" cy="54" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="18" cy="73" r="7" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <line x1="16" y1="24" x2="26" y2="34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>

          {/* ── FRONT WHEEL ── */}
          <g transform="translate(685, 395)">
            <g
              className={`wheel-spin${isComplete ? ' active' : ''}`}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <circle r="88" fill="none" strokeWidth="11"
                stroke={color('wheelset')} style={{ filter: glow('wheelset') }} />
              <circle r="74" fill="none" strokeWidth="2.5"
                stroke={color('wheelset')} opacity="0.35" />
              <g stroke={color('wheelset')}>{spokes(18, 87)}</g>
              <circle r="9" fill={color('wheelset')} />
            </g>
          </g>

          {/* ── FRAME ── */}
          <g style={{ color: color('frame'), filter: glow('frame') }}>
            {/* Down tube: head-tube-bottom(545,268) → BB(355,395) */}
            <path d="M545,268 L355,395" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
            {/* Top tube: seat-top(322,240) → head-tube-top(540,220) */}
            <path d="M322,240 L540,220" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            {/* Seat tube: BB(355,395) → seat-top(322,240) */}
            <path d="M355,395 L322,240" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
            {/* Chain stay: BB(355,395) → rear-dropout(210,395) */}
            <path d="M355,395 L210,395" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            {/* Seat stay: seat-top(322,240) → rear-dropout(210,395) */}
            <path d="M322,240 L210,395" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            {/* Head tube rect */}
            <rect x="532" y="212" width="16" height="62" rx="6" fill="currentColor" />
          </g>

          {/* ── FORK ── */}
          <g style={{ color: color('fork'), filter: glow('fork') }}>
            <path d="M533,268 L685,395" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            <path d="M543,268 L692,395" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
          </g>

          {/* ── SEAT POST ── */}
          <g style={{ color: color('seatPost'), filter: glow('seatPost') }}>
            <path d="M322,240 L318,190" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          </g>

          {/* ── SEAT ── */}
          <g style={{ color: color('seat'), filter: glow('seat') }}>
            <path
              d="M286,186 Q302,172 318,178 Q334,172 352,186 Q335,196 318,194 Q300,196 286,186 Z"
              fill="currentColor"
            />
            {/* Saddle rails */}
            <line x1="296" y1="192" x2="318" y2="194" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          </g>

          {/* ── STEM ── */}
          <g style={{ color: color('stem'), filter: glow('stem') }}>
            <path d="M540,220 L565,196" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
          </g>

          {/* ── HANDLEBARS (drop bar) ── */}
          <g style={{ color: color('handlebars'), filter: glow('handlebars') }}>
            <path d="M550,193 L582,193" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
            <path d="M582,193 Q596,193 596,209 Q596,232 574,232"
              fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </g>

          {/* ── LEVERS (brake/shift levers on hood) ── */}
          <g style={{ color: color('levers'), filter: glow('levers') }}>
            {/* Hood body — teardrop shape on top of bar */}
            <path d="M576,187 Q582,182 588,185 Q592,188 590,196 Q588,202 582,203 Q577,202 576,196 Z"
              fill="currentColor" />
            {/* Lever blade hanging down from hood */}
            <path d="M584,200 Q586,212 582,218"
              fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          </g>

          {/* ── HEADSET ── */}
          <g style={{ color: color('headset'), filter: glow('headset') }}>
            <rect x="529" y="208" width="22" height="8" rx="3" fill="currentColor" />
            <rect x="530" y="266" width="22" height="8" rx="3" fill="currentColor" />
          </g>

          {/* ── BOTTOM BRACKET ── */}
          <g style={{ color: color('bottomBracket'), filter: glow('bottomBracket') }}>
            <circle cx="355" cy="395" r="17" fill="currentColor" />
            <circle cx="355" cy="395" r="11" fill="none" stroke="#0f172a" strokeWidth="2" />
            <circle cx="355" cy="395" r="5" fill="#0f172a" />
          </g>

          {/* ── CRANK + CHAINRING ── */}
          <g style={{ color: color('crank'), filter: glow('crank') }}>
            {/* Crank arm */}
            <path d="M355,395 L360,453" fill="none" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
            {/* Pedal */}
            <rect x="343" y="451" width="30" height="9" rx="4" fill="currentColor" />
            {/* Chainring outer */}
            <circle cx="355" cy="395" r="42" fill="none" stroke="currentColor" strokeWidth="5" />
            {/* Chainring inner */}
            <circle cx="355" cy="395" r="34" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
            {/* Chainring teeth */}
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * Math.PI * 2) / 24;
              return (
                <line key={i}
                  x1={355 + Math.cos(a) * 42} y1={395 + Math.sin(a) * 42}
                  x2={355 + Math.cos(a) * 47} y2={395 + Math.sin(a) * 47}
                  stroke="currentColor" strokeWidth="2.5" />
              );
            })}
          </g>

          {/* ── CHAIN ── */}
          <g style={{ color: color('chain'), filter: glow('chain') }}>
            <path d="M355,353 L210,365" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5,3" />
            <path d="M355,437 L210,425" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="5,3" />
          </g>

          {/* ── FRONT DERAILLEUR ── */}
          <g style={{ color: color('frontDerailleur'), filter: glow('frontDerailleur') }}>
            <rect x="360" y="356" width="20" height="30" rx="2" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M365,356 L365,346" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M376,356 L376,346" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </g>

        </g>
        {/* ── end .bike-all ── */}
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
