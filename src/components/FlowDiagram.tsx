/**
 * FlowDiagram — animated full-stack pipeline.
 *
 * Four-stage architecture sketch: DB (source of truth) → API handler →
 * microservices → UI render. Wires between stages carry small packets
 * that animate continuously, suggesting live data flow. Renders inside
 * an accent-tinted panel so it sits as a single graphic on the page.
 *
 * Theme-aware: dark accent → ink strokes; light accent → cream strokes.
 * Strokes contrast with the *panel*, not the page background.
 */

import { useTheme } from '../lib/theme'

export default function FlowDiagram() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Strokes contrast with the panel (which is the accent color in either mode).
  // Dark mode panel is amber → dark strokes pop.
  // Light mode panel is vermillion → cream strokes pop.
  const stroke      = isDark ? 'rgba(18, 16, 12, 0.94)' : 'rgba(255, 252, 246, 0.96)'
  const strokeSoft  = isDark ? 'rgba(18, 16, 12, 0.55)' : 'rgba(255, 252, 246, 0.62)'
  const fillSoft    = isDark ? 'rgba(18, 16, 12, 0.06)' : 'rgba(255, 252, 246, 0.07)'
  const gridStroke  = isDark ? 'rgba(18, 16, 12, 0.16)' : 'rgba(255, 252, 246, 0.13)'
  // Packet color sits between the two — visible against the panel either way.
  const packet      = isDark ? 'rgba(18, 16, 12, 0.95)' : 'rgba(255, 252, 246, 0.98)'

  // Wire y-coordinates (top → bottom) for routing packets
  const W = {
    dbBottom:       82,
    apiTop:        118,
    apiBottom:     174,
    svcTop:        210,
    svcBottom:     250,
    uiTop:         296,
  }

  // Renders an animated packet on a vertical wire between y1 and y2 on column cx.
  // Multiple packets per wire are spaced by `delay` to read as a continuous stream.
  const Packet = ({ cx, y1, y2, delay = 0, dur = 1.8 }: {
    cx: number; y1: number; y2: number; delay?: number; dur?: number
  }) => (
    <circle r="3" cx={cx} cy={y1} fill={packet}>
      <animate
        attributeName="cy"
        values={`${y1};${y2}`}
        dur={`${dur}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.12;0.85;1"
        dur={`${dur}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
    </circle>
  )

  return (
    <div className="flow-diagram" aria-hidden>
      <svg
        className="flow-diagram-svg"
        viewBox="0 0 300 380"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="flow-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={gridStroke} strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="300" height="380" fill="url(#flow-grid)" />

        {/* ── Top label only — kept short to avoid collision ── */}
        <g
          fill={strokeSoft}
          fontFamily="'Spline Sans Mono', 'JetBrains Mono', monospace"
          fontSize="7.5"
          letterSpacing="0.22em"
        >
          <text x="14" y="20">DB → API → SERVICES → UI</text>
        </g>

        {/* ── 01 · DB (cylinder, top) ── */}
        <g>
          {/* Top oval */}
          <ellipse cx="150" cy="52" rx="56" ry="13" fill={fillSoft} stroke={stroke} strokeWidth="1.5" />
          {/* Side rect fill so the body isn't transparent through grid */}
          <rect x="94" y="52" width="112" height="22" fill={fillSoft} />
          {/* Left side */}
          <line x1="94"  y1="52" x2="94"  y2="74" stroke={stroke} strokeWidth="1.5" />
          {/* Right side */}
          <line x1="206" y1="52" x2="206" y2="74" stroke={stroke} strokeWidth="1.5" />
          {/* Bottom arc (visible curve only — no double-arc artifact) */}
          <path d="M 94 74 A 56 13 0 0 0 206 74" fill="none" stroke={stroke} strokeWidth="1.5" />
          {/* Top arc echo at ~30% opacity for depth (subtle, no double-line) */}
          <path d="M 94 52 A 56 13 0 0 1 206 52" fill="none" stroke={strokeSoft} strokeWidth="0.8" />
          <text x="150" y="62" textAnchor="middle" fill={stroke}
                fontFamily="'Spline Sans Mono', 'JetBrains Mono', monospace"
                fontSize="11" letterSpacing="0.22em">DB</text>
        </g>

        {/* ── Wire: DB → API ── */}
        <line x1="150" y1={W.dbBottom} x2="150" y2={W.apiTop}
              stroke={strokeSoft} strokeWidth="1.2" strokeDasharray="3 4" />
        <Packet cx={150} y1={W.dbBottom} y2={W.apiTop} delay={0}   dur={1.6} />
        <Packet cx={150} y1={W.dbBottom} y2={W.apiTop} delay={0.8} dur={1.6} />

        {/* ── 02 · API / Handler ── */}
        <g>
          <rect x="92" y={W.apiTop} width="116" height="56"
                fill={fillSoft} stroke={stroke} strokeWidth="1.5" rx="2" />
          <text x="150" y={W.apiTop + 26} textAnchor="middle" fill={stroke}
                fontFamily="'Spline Sans Mono', 'JetBrains Mono', monospace"
                fontSize="11" letterSpacing="0.22em">API</text>
          <text x="150" y={W.apiTop + 42} textAnchor="middle" fill={strokeSoft}
                fontFamily="'Spline Sans Mono', 'JetBrains Mono', monospace"
                fontSize="7" letterSpacing="0.2em">/HANDLER</text>
        </g>

        {/* ── Wire: API → Services (three parallel branches) ── */}
        {[
          { cx: 90,  startX: 150 },
          { cx: 150, startX: 150 },
          { cx: 210, startX: 150 },
        ].map((s, i) => (
          <g key={i}>
            {/* L-shaped wire from API bottom-center to each service top */}
            <path
              d={`M 150 ${W.apiBottom} L 150 ${(W.apiBottom + W.svcTop) / 2} L ${s.cx} ${(W.apiBottom + W.svcTop) / 2} L ${s.cx} ${W.svcTop}`}
              fill="none"
              stroke={strokeSoft}
              strokeWidth="1.2"
              strokeDasharray="3 4"
            />
          </g>
        ))}

        {/* Packet that fans out — three stagged dots */}
        <Packet cx={90}  y1={W.apiBottom + 12} y2={W.svcTop} delay={0.2} dur={1.4} />
        <Packet cx={150} y1={W.apiBottom + 12} y2={W.svcTop} delay={0.5} dur={1.4} />
        <Packet cx={210} y1={W.apiBottom + 12} y2={W.svcTop} delay={0.8} dur={1.4} />

        {/* ── 03 · Microservices (three boxes) ── */}
        {[
          { cx: 90,  label: 'auth' },
          { cx: 150, label: 'queue' },
          { cx: 210, label: 'log' },
        ].map(s => (
          <g key={s.label}>
            <rect
              x={s.cx - 26}
              y={W.svcTop}
              width="52"
              height="40"
              fill={fillSoft}
              stroke={stroke}
              strokeWidth="1.3"
              rx="2"
            />
            <text
              x={s.cx}
              y={W.svcTop + 17}
              textAnchor="middle"
              fill={strokeSoft}
              fontFamily="'Spline Sans Mono', 'JetBrains Mono', monospace"
              fontSize="6.5"
              letterSpacing="0.22em"
            >SERVICE</text>
            <text
              x={s.cx}
              y={W.svcTop + 29}
              textAnchor="middle"
              fill={stroke}
              fontFamily="'Spline Sans Mono', 'JetBrains Mono', monospace"
              fontSize="8.5"
              letterSpacing="0.16em"
            >{s.label}</text>
          </g>
        ))}

        {/* ── Wires: Services → UI (converge back to center) ── */}
        {[90, 150, 210].map(cx => (
          <path
            key={cx}
            d={`M ${cx} ${W.svcBottom} L ${cx} ${(W.svcBottom + W.uiTop) / 2} L 150 ${(W.svcBottom + W.uiTop) / 2} L 150 ${W.uiTop}`}
            fill="none"
            stroke={strokeSoft}
            strokeWidth="1.2"
            strokeDasharray="3 4"
          />
        ))}

        {/* Converging packets */}
        <Packet cx={90}  y1={W.svcBottom + 6} y2={W.svcBottom + 18} delay={0.0} dur={1.2} />
        <Packet cx={150} y1={W.svcBottom + 6} y2={W.svcBottom + 18} delay={0.4} dur={1.2} />
        <Packet cx={210} y1={W.svcBottom + 6} y2={W.svcBottom + 18} delay={0.8} dur={1.2} />
        <Packet cx={150} y1={W.svcBottom + 24} y2={W.uiTop} delay={0.6} dur={1.0} />

        {/* ── 04 · UI mockup (bottom) ── */}
        <g>
          <rect x="64"  y={W.uiTop} width="172" height="62"
                fill={fillSoft} stroke={stroke} strokeWidth="1.5" rx="1" />
          {/* Window chrome */}
          <rect x="64"  y={W.uiTop} width="172" height="12" fill={strokeSoft} />
          <circle cx={74} cy={W.uiTop + 6} r="2" fill={stroke} />
          <circle cx={82} cy={W.uiTop + 6} r="2" fill={strokeSoft} />
          <circle cx={90} cy={W.uiTop + 6} r="2" fill={strokeSoft} />
          {/* Content lines */}
          <rect x="74" y={W.uiTop + 22} width="80" height="5" fill={stroke} opacity="0.85" />
          <rect x="74" y={W.uiTop + 32} width="58" height="5" fill={strokeSoft} />
          <rect x="74" y={W.uiTop + 42} width="98" height="5" fill={strokeSoft} opacity="0.7" />
          {/* UI label */}
          <text x="150" y={W.uiTop + 56} textAnchor="middle" fill={stroke}
                fontFamily="'Spline Sans Mono', 'JetBrains Mono', monospace"
                fontSize="8" letterSpacing="0.22em">UI</text>
        </g>

        {/* Bottom-right corner reference (no overlap with UI box now) */}
        <g
          fill={strokeSoft}
          fontFamily="'Spline Sans Mono', 'JetBrains Mono', monospace"
          fontSize="7.5"
          letterSpacing="0.22em"
        >
          <text x="286" y="372" textAnchor="end">FIG · 01</text>
        </g>
      </svg>
    </div>
  )
}
