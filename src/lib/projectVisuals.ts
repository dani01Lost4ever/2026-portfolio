/**
 * projectVisuals.ts — resolves the particle-field visuals for a project.
 *
 * Each project needs a ShapeId, a 4-layer tech cube, a short caption, and a
 * two-colour tint. CMS content may supply these directly; most projects don't
 * (yet), so we fall back to a built-in registry keyed by slug (mirroring the
 * values baked into designs/field.html), and finally to heuristics derived
 * from the project's own tags/subtitle/gradient so a brand-new CMS project
 * never renders with nothing.
 *
 * Resolution order per field: CMS value (if valid) → registry entry for the
 * slug → generic fallback.
 */

import type { ShapeId, CubeLayer } from '../field/contract'
import type { Project } from './types'

/**
 * Mirrors the `ShapeId` union in field/contract.ts. contract.ts only exports
 * a type (erased at runtime), and it belongs to the field driver's own
 * source tree, so this list is kept here and must be updated alongside it
 * if a shape is ever added or renamed.
 */
const SHAPE_IDS: readonly ShapeId[] = [
  'grid', 'bug', 'loop', 'orbit', 'candles', 'globe', 'clocks', 'coins',
  'browser', 'tictactoe', 'battleship', 'clusters', 'helix', 'at', 'constellation',
]

export interface ProjectVisuals {
  shape: ShapeId
  layers: CubeLayer[]
  caption: string
  tint: [string, string]
}

// ─── colour helpers ─────────────────────────────────────────────────────────

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g

/** The design's fallback tint (aqua → peach) for gradients we can't parse. */
const DEFAULT_TINT: [string, string] = ['#72E4D5', '#FFB88A']

/**
 * Pulls the first and last hex colour out of a CSS `linear-gradient(...)`
 * string and returns them as a [top, bottom] tint pair. Falls back to the
 * field's aqua/peach pair when the gradient has fewer than two hex colours
 * (or isn't parseable at all).
 */
export function parseGradientTint(gradient: string | undefined | null): [string, string] {
  if (!gradient) return DEFAULT_TINT
  const hexes = gradient.match(HEX_RE)
  if (!hexes || hexes.length === 0) return DEFAULT_TINT
  if (hexes.length === 1) return [hexes[0], hexes[0]]
  return [hexes[0], hexes[hexes.length - 1]]
}

// ─── validation ───────────────────────────────────────────────────────────────

const SHAPE_ID_SET = new Set<string>(SHAPE_IDS)

export function isShapeId(value: unknown): value is ShapeId {
  return typeof value === 'string' && SHAPE_ID_SET.has(value)
}

export function isCubeLayer(value: unknown): value is CubeLayer {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v['label'] === 'string' && typeof v['tech'] === 'string'
}

export function isCubeLayerArray(value: unknown): value is CubeLayer[] {
  return Array.isArray(value) && value.length > 0 && value.every(isCubeLayer)
}

// ─── registry ─────────────────────────────────────────────────────────────────
// Shape, layers and caption for each known slug. The first six match
// designs/field.html exactly (its inlined TechCube project data and each
// project's <p class="caption">); the last four are new, written in the same
// plain, present-tense voice.

interface RegistryEntry {
  shape: ShapeId
  layers: CubeLayer[]
  caption: string
  /** Explicit tint override — used when the gradient itself would mislead (e.g. The Loop is greyscale). */
  tint?: [string, string]
}

const REGISTRY: Record<string, RegistryEntry> = {
  bugpilot: {
    shape: 'bug',
    layers: [
      { label: 'Client', tech: 'Embed widget' },
      { label: 'API', tech: 'Express' },
      { label: 'Worker', tech: 'BullMQ + Claude' },
      { label: 'Storage', tech: 'MongoDB · Redis · MinIO' },
    ],
    caption: 'Every report lands in the reticle, already triaged.',
  },
  'the-loop': {
    shape: 'loop',
    layers: [
      { label: 'Front', tech: 'Next.js 15' },
      { label: 'CMS', tech: 'Payload v3' },
      { label: 'Search', tech: 'Meilisearch' },
      { label: 'Data', tech: 'Postgres' },
    ],
    caption: 'One loop of dispatches, guides and labs, all self-hosted.',
    // The Loop's own gradient is greyscale (#0f0f0f → #525252); the design
    // uses a soft pearl/silver tint instead so its shape still reads as a point cloud.
    tint: ['#EEF0F4', '#A9B1C2'],
  },
  'stellar-freight-co': {
    shape: 'orbit',
    layers: [
      { label: 'Client', tech: 'React + Zustand' },
      { label: 'Protocol', tech: 'Zod wire schemas' },
      { label: 'Server', tech: 'Fastify tick sim' },
      { label: 'Deploy', tech: 'Fly.io' },
    ],
    caption: 'Drones on orbit, driven by one fixed-tick clock.',
    tint: ['#a78bfa', '#6366f1'],
  },
  auroratrader: {
    shape: 'candles',
    layers: [
      { label: 'Dashboard', tech: 'React + Recharts' },
      { label: 'API', tech: 'Express' },
      { label: 'Agent', tech: 'Claude → Ollama' },
      { label: 'Data', tech: 'MongoDB' },
    ],
    caption: 'Only the winning trades become training data.',
  },
  'cloudflare-ddns-client': {
    shape: 'globe',
    layers: [
      { label: 'Dashboard', tech: 'Flask' },
      { label: 'State', tech: 'status.json' },
      { label: 'Daemon', tech: 'Python poller' },
      { label: 'Upstream', tech: 'Cloudflare API' },
    ],
    caption: 'An IP changes, and the records follow in seconds.',
  },
  'agendash-3': {
    shape: 'clocks',
    layers: [
      { label: 'UI', tech: 'Bootstrap' },
      { label: 'Middleware', tech: 'Express · Hapi · Koa · Fastify' },
      { label: 'Scheduler', tech: 'Agenda.js' },
      { label: 'Logs', tech: 'MongoDB tasklogs' },
    ],
    caption: 'Twelve jobs, twelve clocks, every run logged.',
  },
  'openai-cost-calculator': {
    shape: 'coins',
    layers: [
      { label: 'Package', tech: 'npm module' },
      { label: 'API', tech: 'Five cost functions' },
      { label: 'Pricing', tech: 'Model price table' },
      { label: 'Models', tech: 'GPT-4o · Embeddings · Whisper' },
    ],
    caption: 'Five functions, one price table, kept current.',
  },
  'original-portfolio': {
    shape: 'browser',
    layers: [
      { label: 'Markup', tech: 'HTML' },
      { label: 'Style', tech: 'CSS' },
      { label: 'Script', tech: 'Vanilla JS' },
      { label: 'Extras', tech: 'Particles.js · Swiper' },
    ],
    caption: 'Where it started, built from raw HTML, CSS and JS.',
  },
  'tictactoe-ai': {
    shape: 'tictactoe',
    layers: [
      { label: 'UI', tech: 'WinForms' },
      { label: 'Engine', tech: 'C#' },
      { label: 'AI', tech: 'Minimax' },
      { label: 'Speed', tech: 'Alpha-beta pruning' },
    ],
    caption: 'Minimax searches every move, so the AI never loses.',
  },
  'battleship-ai': {
    shape: 'battleship',
    layers: [
      { label: 'UI', tech: 'WinForms' },
      { label: 'Engine', tech: '.NET 6' },
      { label: 'AI', tech: 'Hunt / target' },
      { label: 'Board', tech: '10×10 grid' },
    ],
    caption: 'Random hits turn to targeted strikes until the ship sinks.',
  },
}

// ─── fallback heuristics (unknown slugs) ───────────────────────────────────────

function fallbackLayers(p: Project): CubeLayer[] {
  const tags = p.tags.filter(Boolean)
  const chunkSize = Math.max(1, Math.ceil(tags.length / 4))
  const chunks: string[][] = []
  for (let i = 0; i < tags.length; i += chunkSize) chunks.push(tags.slice(i, i + chunkSize))

  const labels = ['Stack', 'Layer', 'Tooling', 'Infra']
  const layers: CubeLayer[] = []
  for (let i = 0; i < 4; i++) {
    const tech = chunks[i]?.join(' · ') || tags[tags.length - 1] || p.role || 'Custom build'
    layers.push({ label: labels[i], tech })
  }
  return layers
}

function fallbackVisuals(p: Project): ProjectVisuals {
  return {
    shape: 'constellation',
    layers: fallbackLayers(p),
    caption: p.subtitle || p.title,
    tint: parseGradientTint(p.gradient),
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

export function visualsFor(p: Project): ProjectVisuals {
  const entry = REGISTRY[p.slug]
  const fallback = fallbackVisuals(p)

  const shape = isShapeId(p.shape) ? p.shape : entry?.shape ?? fallback.shape
  const layers = isCubeLayerArray(p.layers) ? p.layers : entry?.layers ?? fallback.layers
  const caption = (p.caption && p.caption.trim()) || entry?.caption || fallback.caption
  const tint = entry?.tint ?? fallback.tint

  return { shape, layers, caption, tint }
}
