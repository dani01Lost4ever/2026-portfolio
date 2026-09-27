/**
 * glassWordGL.ts — the case study's glass word on one WebGL canvas.
 *
 * Eight SVG-filtered letters cost eight filter passes and eight rasterised copies of the
 * poster per frame; here one fragment shader draws them all. Each letter is a signed distance
 * field (from the same EDT as the SVG glass) in one atlas; the poster behind is rasterised
 * once into a texture, with its fonts embedded so the refracted text matches the page.
 * The melt into the droplet is a smooth union of the letters' fields and the droplet's circle,
 * so they flow together like liquid. Refraction, chromatic edges, tint and rim light follow
 * the SVG glass (glass.ts) so the two read as one material.
 */

import type { GlyphMaps } from './glass'
import type { Rect } from './math'
import { posterDefsMarkup } from '../posters'

/** Letters per word: 12 keeps the uniforms within what older GPUs offer (the SVG glass takes longer titles). */
export const MAX_LETTERS = 12
const MAX = MAX_LETTERS
/** Atlas px per native px (distance fields upsample well). */
const AS = 0.5

const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'

const FS = `precision highp float;
#define N ${MAX}
uniform vec2 uRes; uniform float uDpr;
uniform sampler2D uAtlas; uniform vec2 uAtlasSize; uniform float uRange;
uniform sampler2D uBack; uniform vec3 uBack3;
uniform int uN; uniform vec4 uLp[N]; uniform vec3 uLa[N];
uniform vec3 uDrop; uniform float uK;
uniform float uBevel, uScale, uTint, uSat;

float smin(float a, float b, float k) {
  if (k < .01) return min(a, b);
  float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
  return mix(b, a, h) - k * h * (1. - h);
}
// distance to the union (negative inside), and the scale of the nearest letter
// (uniform arrays may only be indexed by the loop counter in GLSL ES 1.0, so the lookup lives here)
vec2 scene(vec2 p) {
  float d = uDrop.z > 0. ? length(p - uDrop.xy) - uDrop.z : 1e4;
  float best = d, s = 1.;
  for (int i = 0; i < N; i++) {
    if (i >= uN) break;
    vec4 lp = uLp[i]; vec3 la = uLa[i];
    float l = 1e4;
    if (lp.z >= .003) {
      vec2 loc = (p - lp.xy) / lp.z;
      if (loc.x >= 0. && loc.y >= 0. && loc.x <= la.y && loc.y <= la.z) {
        vec2 uv = vec2(la.x + loc.x * ${AS.toFixed(2)}, loc.y * ${AS.toFixed(2)}) / uAtlasSize;
        l = (texture2D(uAtlas, uv).r - .5) * 2. * uRange * lp.z;
      }
    }
    if (l < best) { best = l; s = lp.z; }
    d = smin(d, l, uK);
  }
  return vec2(d, s);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 ds = scene(p);
  float d = ds.x, s = ds.y;
  if (d > 1.5) discard;
  float e = .75;
  vec2 g = vec2(scene(p + vec2(e, 0.)).x - scene(p - vec2(e, 0.)).x, scene(p + vec2(0., e)).x - scene(p - vec2(0., e)).x);
  vec2 n = length(g) > 1e-5 ? normalize(g) : vec2(0.);
  float depth = max(-d, 0.), bev = uBevel * s;
  float m = depth < bev ? pow(1. - depth / bev, 2.) : 0.;
  vec2 off = n * m * uScale * s * .5;
  vec3 col = vec3(
    texture2D(uBack, (p + off - uBack3.xy) / uBack3.z).r,
    texture2D(uBack, (p + off * .9 - uBack3.xy) / uBack3.z).g,
    texture2D(uBack, (p + off * .8 - uBack3.xy) / uBack3.z).b);
  float lum = dot(col, vec3(.2126, .7152, .0722));
  col = mix(vec3(lum), col, uSat);
  col = mix(col, vec3(1.), uTint);
  float ld = dot(n, normalize(vec2(-.55, -.83)));
  float rim = exp(-depth / (.9 * max(s, .2))) * .95 + .24 * m;
  float a = clamp(rim * (.3 + .7 * max(0., ld) + .25 * max(0., -ld)), 0., 1.);
  float sh = clamp(.5 * m * max(0., -ld) + .18 * m, 0., 1.);
  float A = a + sh * (1. - a);
  col = mix(col, vec3(A > 0. ? a / (a + sh + 1e-6) : 1.), A);
  float alpha = clamp(.5 - d, 0., 1.);
  gl_FragColor = vec4(col * alpha, alpha);
}`

export interface WordLetter { X: number; Y: number; S: number }
export interface WordFrame {
  letters: WordLetter[]
  /** The droplet the word melts into: centre and radius in px, or null. */
  drop: { x: number; y: number; r: number } | null
  /** Smooth-union radius in px (0: letters stay apart). */
  k: number
  /** Where the poster's 400×400 viewBox sits on screen. */
  back: Rect
  bevel: number
  scale: number
}

export class GlassWordGL {
  readonly canvas: HTMLCanvasElement
  ready = false
  private readonly gl: WebGLRenderingContext
  private readonly u: Record<string, WebGLUniformLocation | null> = {}
  private readonly atlasTex: WebGLTexture
  private readonly backTex: WebGLTexture
  private boxes: { ax: number; w: number; h: number }[] = []
  private dpr = 1
  private lost = false
  private backKey = ''
  private shown = false

  static create(parent: Element): GlassWordGL | null {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true })
    if (!gl) return null
    try { return new GlassWordGL(parent, c, gl) } catch (e) { if (import.meta.env.DEV) console.warn('[glassWordGL] falling back to SVG glass:', e); return null }
  }

  private constructor(parent: Element, c: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.canvas = c; this.gl = gl
    c.className = 'glass-gl'
    c.setAttribute('aria-hidden', 'true')
    c.style.display = 'none'
    parent.appendChild(c)
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) throw new Error('shader')
      gl.shaderSource(s, src); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'compile')
      return s
    }
    const prog = gl.createProgram()
    if (!prog) throw new Error('program')
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link')
    gl.useProgram(prog)
    for (const n of ['uRes', 'uDpr', 'uAtlas', 'uAtlasSize', 'uRange', 'uBack', 'uBack3', 'uN', 'uLp', 'uLa', 'uDrop', 'uK', 'uBevel', 'uScale', 'uTint', 'uSat']) this.u[n] = gl.getUniformLocation(prog, n)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const tex = () => {
      const t = gl.createTexture()
      if (!t) throw new Error('texture')
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return t
    }
    this.atlasTex = tex(); this.backTex = tex()
    gl.uniform1i(this.u.uAtlas, 0); gl.uniform1i(this.u.uBack, 1)
    gl.uniform1f(this.u.uTint, 0.16); gl.uniform1f(this.u.uSat, 1.35)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    c.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.ready = false })
  }

  resize(vw: number, vh: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = Math.round(vw * this.dpr), H = Math.round(vh * this.dpr)
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H }
    this.canvas.style.width = vw + 'px'; this.canvas.style.height = vh + 'px'
  }

  /** The letters' distance fields, packed side by side into one atlas. */
  glyphs(list: GlyphMaps[], range: number) {
    const gl = this.gl
    if (list.length > MAX) throw new Error('too many glyphs')
    let x = 0, H = 1
    this.boxes = list.map(g => { const b = { ax: x, w: g.w, h: g.h }; x += Math.ceil(g.w * AS) + 2; H = Math.max(H, Math.ceil(g.h * AS)); return b })
    const W = Math.max(1, x)
    const data = new Uint8Array(W * H)
    list.forEach((g, i) => {
      const ox = this.boxes[i].ax, aw = Math.ceil(g.w * AS), ah = Math.ceil(g.h * AS)
      for (let y = 0; y < ah; y++) for (let xx = 0; xx < aw; xx++) {
        const sx = Math.min(g.W - 1, Math.round(((xx + 0.5) / AS) * g.dpr)), sy = Math.min(g.H - 1, Math.round(((y + 0.5) / AS) * g.dpr))
        data[y * W + ox + xx] = Math.max(0, Math.min(255, Math.round((0.5 + g.sd[sy * g.W + sx] / (2 * range)) * 255)))
      }
    })
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlasTex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, W, H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data)
    gl.uniform2f(this.u.uAtlasSize, W, H); gl.uniform1f(this.u.uRange, range)
    gl.uniform3fv(this.u.uLa, new Float32Array(this.boxes.flatMap(b => [b.ax, b.w, b.h]).concat(Array((MAX - this.boxes.length) * 3).fill(0))))
  }

  /** Rasterise the poster once, at the size it is shown; ready when it lands. */
  async backdrop(sym: string, px: number) {
    const size = Math.min(4096, Math.max(256, Math.round(px)))
    const key = `${sym}|${size}`
    if (key === this.backKey) return
    this.backKey = key
    const img = await rasterPoster(sym, size)
    if (!img || this.lost || key !== this.backKey) return
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.backTex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    this.ready = true
  }

  draw(f: WordFrame) {
    const gl = this.gl
    const on = f.letters.some(l => l.S > 0.003) || !!f.drop
    if (!on) { this.hide(); return }
    if (!this.shown) { this.canvas.style.display = ''; this.shown = true }
    const lp = new Float32Array(MAX * 4)
    f.letters.forEach((l, i) => { lp.set([l.X, l.Y, l.S, 1], i * 4) })
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height); gl.uniform1f(this.u.uDpr, this.dpr)
    gl.uniform1i(this.u.uN, f.letters.length); gl.uniform4fv(this.u.uLp, lp)
    gl.uniform3f(this.u.uDrop, f.drop?.x ?? 0, f.drop?.y ?? 0, f.drop?.r ?? 0); gl.uniform1f(this.u.uK, f.k)
    gl.uniform3f(this.u.uBack3, f.back.x, f.back.y, f.back.w)
    gl.uniform1f(this.u.uBevel, f.bevel); gl.uniform1f(this.u.uScale, f.scale)
    // only the pixels the word can reach
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    f.letters.forEach((l, i) => {
      if (l.S <= 0.003) return
      const b = this.boxes[i]
      x0 = Math.min(x0, l.X); y0 = Math.min(y0, l.Y); x1 = Math.max(x1, l.X + b.w * l.S); y1 = Math.max(y1, l.Y + b.h * l.S)
    })
    if (f.drop) { const d = f.drop; x0 = Math.min(x0, d.x - d.r); y0 = Math.min(y0, d.y - d.r); x1 = Math.max(x1, d.x + d.r); y1 = Math.max(y1, d.y + d.r) }
    const pad = f.k + 4, H = this.canvas.height, r = this.dpr
    gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.SCISSOR_TEST)
    const sx = Math.max(0, Math.floor((x0 - pad) * r)), sy = Math.max(0, Math.floor(H - (y1 + pad) * r))
    gl.scissor(sx, sy, Math.max(0, Math.ceil((x1 - x0 + 2 * pad) * r)), Math.max(0, Math.ceil((y1 - y0 + 2 * pad) * r)))
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  hide() {
    if (!this.shown) return
    this.shown = false
    this.canvas.style.display = 'none'
  }

  destroy() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    this.canvas.remove()
  }
}

// ─── the poster as a bitmap ────────────────────────────────────────────────────

const embedded = new Map<string, Promise<string>>()

/** @font-face rules for the text in a poster, fonts inlined (an SVG image cannot reach the page's fonts). */
function fontCss(text: string): Promise<string> {
  const chars = [...new Set(text)].join('')
  const hit = embedded.get(chars)
  if (hit) return hit
  const families = ['Geist+Mono:wght@400;500', 'Geist:wght@500;650', 'Archivo:wdth,wght@125,800']
  const url = `https://fonts.googleapis.com/css2?${families.map(f => 'family=' + f).join('&')}&text=${encodeURIComponent(chars)}`
  const p = fetch(url).then(r => (r.ok ? r.text() : '')).then(async css => {
    const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1])
    for (const u of urls) {
      const buf = await fetch(u).then(r => r.arrayBuffer())
      let bin = ''
      const bytes = new Uint8Array(buf)
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      css = css.replace(u, `data:font/woff2;base64,${btoa(bin)}`)
    }
    return css
  }).catch(() => '')
  embedded.set(chars, p)
  return p
}

async function rasterPoster(sym: string, size: number): Promise<HTMLCanvasElement | null> {
  const defs = posterDefsMarkup()
  const body = defs.match(new RegExp(`<symbol id="${sym}"[\\s\\S]*?</symbol>`))?.[0] ?? ''
  const text = [...body.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1]).join('')
  const css = text ? await fontCss(text) : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400"><style>${css}</style><defs>${defs}</defs><use href="#${sym}" width="400" height="400"/></svg>`
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = c.height = size
    const x = c.getContext('2d')
    if (!x) return null
    x.drawImage(img, 0, 0, size, size)
    return c
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
