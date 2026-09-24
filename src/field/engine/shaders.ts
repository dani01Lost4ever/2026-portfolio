/**
 * GLSL for the field: background gradient, the morphing point cloud, and ambient dust.
 * Ported from designs/field.html v3. The only structural change is the per-point packing
 * (group * 16 instead of * 8) so the new project shapes can have their own idle motions.
 *
 * Per-point w = group * 16 + flag + phase * 0.98. Flags:
 *   0 plain              1 highlight          2 travelling pulse     3 orbiting
 *   4 breathing terrain  5 clock hand         6 bright pulse         7 flickering candle
 *   8 coin spin          9 rising price tick  10 drifting particles  11 pruned (dimmed)
 *   12 AI-move pulse     13 hit ripple        14 target probe
 *
 * Shape-local constants that the shader snaps to are shared with the generators here.
 */

/** clocks: cell pitch (flag 5). */
export const CLOCK_PITCH = 1.5
/** coins: distance between stack axes on x (flag 8). */
export const COIN_PITCH = 1.3
/** coins: how far the price tick climbs (flag 9). */
export const TICK_RISE = 3.1
/** tictactoe: board cell size and board centre y (flag 12). */
export const TTT_CELL = 0.8
export const TTT_CY = 1.3
/** battleship: grid cell size (flags 13, 14). */
export const BS_CELL = 0.56

const f = (v: number): string => (Number.isInteger(v) ? v.toFixed(1) : String(v))

export const BG_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'

export const BG_FRAG = [
  'uniform vec3 uTop; uniform vec3 uBot; uniform vec2 uGlow; varying vec2 vUv;',
  'void main(){',
  '  vec3 c = mix(uBot, uTop, smoothstep(0.0, 1.0, vUv.y));',
  '  vec2 q = vUv - uGlow; q.x *= 1.6;',
  '  c += uTop * 0.45 * exp(-dot(q, q) * 5.0);',
  '  vec2 v = vUv - 0.5; c *= 1.0 - dot(v, v) * 0.45;',
  '  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);',
  '  c += (n - 0.5) * 0.006;',
  '  gl_FragColor = vec4(c, 1.0);',
  '}',
].join('\n')

export const POINTS_VERT = [
  'uniform float uTime, uT, uScatter, uSize, uPR, uAlpha, uSA, uSB, uHover, uMouseAmt, uTAa, uTBa;',
  'uniform vec3 uXfA, uXfB, uOA, uOB, uMouse, uColA, uColB, uColH, uFxA, uFxB, uTA0, uTA1, uTB0, uTB1;',
  'uniform vec3 uWaves[8];',
  'uniform vec2 uMouseVel, uRotA, uRotB;',
  'attribute vec4 aFrom; attribute vec4 aTo; attribute vec4 aRand;',
  'varying vec3 vColor; varying float vAlpha;',
  'vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }',
  'vec3 rotX(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }',
  'vec2 rot2(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }',
  'vec3 flow(vec3 p){',
  '  return vec3(sin(p.y*1.7 + uTime*0.5) + sin(p.z*1.3 + 1.7),',
  '              sin(p.z*1.5 + uTime*0.4) + sin(p.x*1.1 + 2.3),',
  '              sin(p.x*1.4 + uTime*0.45) + sin(p.y*1.2 + 0.4));',
  '}',
  'vec3 shape(vec4 d, vec3 xf, vec3 fx, vec2 rot, out float glow, out float dim){',
  '  vec3 p = d.xyz; float g = floor(d.w/16.0); float rem = d.w - g*16.0; float fl = floor(rem); float ph = rem - fl; glow = 0.0; dim = 1.0;',
  '  if (fl > 0.5 && fl < 1.5) { glow = 0.75; }',
  '  else if (fl > 1.5 && fl < 2.5) { float q = fract(ph - uTime*0.11); glow = 0.12 + smoothstep(0.84, 1.0, q)*1.5; }',
  '  else if (fl > 2.5 && fl < 3.5) { p = rotY(p, uTime*0.4); glow = step(0.9, ph); }',
  '  else if (fl > 3.5 && fl < 4.5) {',
  '    p.y += sin(p.x*0.55 + uTime*0.6)*cos(p.z*0.7 - uTime*0.4)*0.38 + sin((p.x - p.z)*1.1 + uTime*0.9)*0.07;',
  '    glow = step(0.5, ph)*0.45;',
  '    float sc = fract((p.z + 7.0)/14.0 - uTime*0.05);',
  '    glow += smoothstep(0.95, 1.0, sc)*0.9;',
  '  }',
  '  else if (fl > 4.5 && fl < 5.5) {',
  `    vec2 c = vec2((floor(p.x/${f(CLOCK_PITCH)}) + 0.5)*${f(CLOCK_PITCH)}, floor(p.y/${f(CLOCK_PITCH)} + 0.5)*${f(CLOCK_PITCH)});`,
  '    float a = -uTime*(ph > 0.5 ? 0.8 : 0.1);',
  '    p.xy = c + rot2(p.xy - c, a);',
  '    glow = 0.35;',
  '  }',
  '  else if (fl > 5.5 && fl < 6.5) { float q = fract(ph - uTime*0.16); glow = 0.7 + smoothstep(0.8, 1.0, q)*1.8; }',
  '  else if (fl > 6.5 && fl < 7.5) { float up = step(0.5, ph); float fk = step(0.6, fract(sin(floor(uTime*2.5) + ph*97.0)*43758.5453)); glow = up*0.55 + fk*(0.25 + up*0.5); }',
  // coin spin: each stack turns about its own vertical axis, the reeded rims make the turn readable
  '  else if (fl > 7.5 && fl < 8.5) {',
  `    float k = floor(p.x/${f(COIN_PITCH)} + 0.5); float cx = k*${f(COIN_PITCH)};`,
  '    vec2 r = vec2(p.x - cx, p.z); float a0 = atan(r.y, r.x);',
  '    r = rot2(r, uTime*(0.42 + 0.09*mod(k + 2.0, 5.0)));',
  '    p.x = cx + r.x; p.z = r.y;',
  '    glow = ph > 0.5 ? 0.12 + 0.6*step(0.7, fract(a0*1.2732395)) : ph*2.0;',
  '  }',
  // rising price tick: climbs the chart, fades in at the bottom and out at the top
  '  else if (fl > 8.5 && fl < 9.5) {',
  '    float q = fract(uTime*0.085);',
  `    p.y += q*${f(TICK_RISE)};`,
  '    glow = ph > 0.5 ? 1.15 : 0.22;',
  '    dim = smoothstep(0.0, 0.08, q)*(1.0 - smoothstep(0.82, 1.0, q));',
  '  }',
  // drifting particles: a smooth displacement field, so links bend with their nodes and stay attached
  '  else if (fl > 9.5 && fl < 10.5) {',
  '    p.x += sin(uTime*0.33 + p.y*1.7 + p.z*2.0)*0.17;',
  '    p.y += cos(uTime*0.29 + p.x*1.3 - p.z)*0.14;',
  '    glow = ph > 0.5 ? 0.85 : 0.05;',
  '  }',
  '  else if (fl > 10.5 && fl < 11.5) { glow = 0.0; dim = 0.3; }',
  // AI move: the mark swells and flares every few seconds
  '  else if (fl > 11.5 && fl < 12.5) {',
  '    float k = pow(max(sin(uTime*0.72), 0.0), 12.0);',
  `    vec2 c = vec2(floor(p.x/${f(TTT_CELL)} + 0.5)*${f(TTT_CELL)}, floor((p.y - ${f(TTT_CY)})/${f(TTT_CELL)} + 0.5)*${f(TTT_CELL)} + ${f(TTT_CY)});`,
  '    p.xy = c + (p.xy - c)*(1.0 + 0.25*k);',
  '    glow = 0.35 + 2.0*k;',
  '  }',
  // hit ripple: rings expand across the board from the struck cell
  '  else if (fl > 12.5 && fl < 13.5) {',
  `    vec2 c = (floor(p.xz/${f(BS_CELL)}) + 0.5)*${f(BS_CELL)};`,
  '    vec2 dd = p.xz - c; vec2 dir = dd/(length(dd) + 1e-4);',
  '    float q = fract(uTime*0.28 + ph);',
  '    p.xz = c + dir*(0.12 + q*2.3); p.y += 0.02;',
  '    glow = 1.1*(1.0 - q);',
  '    dim = smoothstep(0.0, 0.05, q)*(1.0 - smoothstep(0.5, 1.0, q));',
  '  }',
  // target probe: hops one cell at a time along the ship's axis, flaring as it lands
  '  else if (fl > 13.5 && fl < 14.5) {',
  '    float cyc = fract(uTime*0.19); float k = floor(cyc*4.0); float fr = fract(cyc*4.0);',
  '    float hop = k < 2.5 ? smoothstep(0.0, 0.22, fr) : 0.0;',
  `    p.x += (min(k, 3.0) + hop)*${f(BS_CELL)};`,
  '    p.y += sin(3.14159265*hop)*0.32*step(k, 2.5);',
  '    glow = 0.4 + 1.4*(1.0 - smoothstep(0.22, 0.6, fr))*step(k, 2.5) + ph*0.6;',
  '    dim = k > 2.5 ? 1.0 - smoothstep(0.2, 0.9, fr) : 1.0;',
  '  }',
  '  p *= 1.0 + 0.02*sin(uTime*0.9);',
  '  float ang = uTime*xf.x + sin(uTime*0.35)*xf.y + rot.x;',
  '  p = rotY(p, ang); p = rotX(p, xf.z + rot.y);',
  '  if (fx.x > 0.0) glow += fx.x*(0.3 + 1.2*pow(max(sin(length(p)*2.2 - uTime*4.0), 0.0), 6.0));',
  '  if (fx.z > 0.0 && fx.y > 0.5) { if (abs(g - fx.y) < 0.5) glow += 1.2*fx.z; else dim = 1.0 - 0.62*fx.z; }',
  '  return p;',
  '}',
  'void main(){',
  '  float gA, gB, dA, dB;',
  '  vec3 a = shape(aFrom, uXfA, uFxA, uRotA, gA, dA);',
  '  vec3 b = shape(aTo, uXfB, uFxB, uRotB, gB, dB);',
  '  float t = smoothstep(aRand.x, aRand.x + 0.58, uT);',
  '  float mid = sin(3.14159265*t);',
  '  vec3 la = mix(a, b, t);',
  '  vec3 p = mix(a*uSA + uOA, b*uSB + uOB, t);',
  '  p += flow(p*0.35 + aRand.w*5.0)*mid*0.5;',
  '  float s = smoothstep(aRand.z*0.5, aRand.z*0.5 + 0.5, uScatter);',
  '  p = mix(p, position, s);',
  '  p += vec3(sin(uTime*0.7 + aRand.z*40.0), cos(uTime*0.6 + aRand.w*40.0), sin(uTime*0.5 + aRand.y*40.0))*0.025;',
  // pointer field: push away with a smooth falloff, drag + swirl from cursor velocity (bounded)
  '  vec2 dv = p.xy - uMouse.xy; float dl = length(dv); vec2 dir = dv/(dl + 1e-3);',
  '  float fall = exp(-dl*dl*0.7) * uHover * uMouseAmt;',
  '  float sp = min(length(uMouseVel), 4.0);',
  '  p.xy += dir*fall*0.75 + uMouseVel*fall*0.1 + vec2(-dir.y, dir.x)*fall*sp*0.07;',
  '  p.z += fall*0.45;',
  // click shockwaves: up to 8 concurrent rings; displacements add, crossings interfere (extra lift + light), total clamped
  '  vec2 wdisp = vec2(0.0); float wsum = 0.0, wsq = 0.0;',
  '  for (int k = 0; k < 8; k++) {',
  '    float ct = uTime - uWaves[k].z;',
  '    if (ct > 0.0 && ct < 3.0) {',
  '      vec2 dc = p.xy - uWaves[k].xy; float dcl = length(dc);',
  '      float w = exp(-pow((dcl - ct*5.5)/0.5, 2.0)) * exp(-ct);',
  '      wdisp += dc/(dcl + 1e-3)*w; wsum += w; wsq += w*w;',
  '    }',
  '  }',
  '  float inter = clamp(wsum*wsum - wsq, 0.0, 1.0);',
  '  float wdl = length(wdisp); if (wdl > 1.3) wdisp *= 1.3/wdl;',
  '  float wave = min(wsum, 1.3);',
  '  p.xy += wdisp*0.8; p.z += wave*0.5 + inter*0.5;',
  '  vec4 mv = viewMatrix * vec4(p, 1.0);',
  '  gl_Position = projectionMatrix * mv;',
  '  float tw = step(0.965, aRand.y)*pow(max(sin(uTime*1.3 + aRand.z*60.0), 0.0), 12.0)*1.4;',
  '  float glow = mix(gA, gB, t)*(1.0 - s) + fall*0.5 + min(wave, 1.0)*1.2 + inter*1.1 + tw;',
  '  float dim = mix(dA, dB, t);',
  '  float h = smoothstep(-2.1, 2.1, la.y + la.z*0.3);',
  // project tints blended into the aqua->peach palette, cross-faded per point with the morph
  '  vec3 lo = mix(mix(uColA, uTA1, uTAa), mix(uColA, uTB1, uTBa), t);',
  '  vec3 hi = mix(mix(uColB, uTA0, uTAa), mix(uColB, uTB0, uTBa), t);',
  '  vec3 col = mix(lo, hi, h);',
  '  col = mix(col, uColH, clamp(glow*0.45, 0.0, 0.75));',
  '  vColor = col;',
  '  vAlpha = uAlpha*dim*(0.5 + 0.5*aRand.y)*(1.0 + glow*0.6)*(1.0 - mid*0.25);',
  '  gl_PointSize = min(uSize*1.7*(0.55 + aRand.y*0.9)*(1.0 + glow*0.8)*uPR / max(-mv.z, 0.5), 56.0*uPR);',
  '}',
].join('\n')

export const POINTS_FRAG = [
  'varying vec3 vColor; varying float vAlpha;',
  'void main(){',
  '  vec2 c = gl_PointCoord - 0.5; float d = length(c);',
  '  if (d > 0.5) discard;',
  '  float core = smoothstep(0.2, 0.04, d);',
  '  float halo = exp(-d*d*20.0)*0.26;',
  '  float a = core + halo;',
  '  gl_FragColor = vec4(vColor, a*vAlpha);',
  '}',
].join('\n')

export const AMBIENT_VERT = [
  'uniform float uTime, uPR, uHover, uScroll, uSize; uniform vec3 uCam, uRay, uColA, uColB; uniform vec3 uWaves[8];',
  'attribute vec4 aSeed; varying vec3 vC; varying float vA; float vB = 0.0;',
  'void main(){',
  '  vec3 p = position; float depth = (p.z + 10.0)/16.0;',
  '  p.x += sin(uTime*0.05 + aSeed.x*6.283)*0.7;',
  '  p.y += cos(uTime*0.04 + aSeed.y*6.283)*0.6 + uScroll*(0.25 + depth*0.9);',
  '  p.y = mod(p.y + 9.0, 18.0) - 9.0;',
  '  vec2 m = uCam.xy + uRay.xy*((p.z - uCam.z)/uRay.z);',
  '  vec2 dv = p.xy - m; float dl = length(dv);',
  '  p.xy += dv/(dl + 1e-3)*exp(-dl*dl*0.45)*uHover*0.6;',
  '  vec2 wd = vec2(0.0); float ws = 0.0, wq = 0.0;',
  '  for (int k = 0; k < 8; k++) { float ct = uTime - uWaves[k].z; if (ct > 0.0 && ct < 3.0) { vec2 dc = p.xy - uWaves[k].xy; float dcl = length(dc); float w = exp(-pow((dcl - ct*5.5)/0.6, 2.0))*exp(-ct); wd += dc/(dcl + 1e-3)*w; ws += w; wq += w*w; } }',
  '  float wl = length(wd); if (wl > 1.2) wd *= 1.2/wl;',
  '  p.xy += wd*0.6; vB = min(ws, 1.2)*0.6 + clamp(ws*ws - wq, 0.0, 1.5)*1.2;',
  '  vec4 mv = viewMatrix*vec4(p, 1.0); gl_Position = projectionMatrix*mv;',
  '  float tw = 0.6 + 0.4*sin(uTime*(0.6 + aSeed.w) + aSeed.z*40.0);',
  '  vC = mix(uColA, uColB, aSeed.x*0.8);',
  '  vA = (0.2 + 0.34*aSeed.w)*tw*(1.0 + vB*2.5);',
  '  gl_PointSize = uSize*(0.35 + aSeed.z*0.65)*uPR / max(-mv.z, 1.0);',
  '}',
].join('\n')

export const AMBIENT_FRAG = [
  'varying vec3 vC; varying float vA;',
  'void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, smoothstep(0.5, 0.0, d)*vA); }',
].join('\n')
