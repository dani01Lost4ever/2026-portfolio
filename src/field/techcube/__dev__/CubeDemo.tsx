/**
 * CubeDemo — dev-only harness for TechCube.
 *
 * Ten stacked project slots over a tall page, each holding one TechCube, so
 * drag/keyboard turns, scroll-driven progress, tint and captions can all be
 * eyeballed without the rest of the site. Sample data lives only here.
 */
import { TechCube } from '../TechCube'
import type { CubeLayer } from '../../contract'

interface DemoProject {
  slug: string
  name: string
  layers: CubeLayer[]
  tint: [string, string]
}

// The six real projects use the exact layer data from designs/field.html's
// TechCube PROJECTS constant; the other four are plausible stand-ins.
const PROJECTS: DemoProject[] = [
  {
    slug: 'bugpilot',
    name: 'BugPilot',
    tint: ['#dc2626', '#7c3aed'],
    layers: [
      { label: 'Client', tech: 'Embed widget' },
      { label: 'API', tech: 'Express' },
      { label: 'Worker', tech: 'BullMQ + Claude' },
      { label: 'Storage', tech: 'MongoDB · Redis · MinIO' },
    ],
  },
  {
    slug: 'the-loop',
    name: 'The Loop',
    tint: ['#EEF0F4', '#A9B1C2'],
    layers: [
      { label: 'Front', tech: 'Next.js 15' },
      { label: 'CMS', tech: 'Payload v3' },
      { label: 'Search', tech: 'Meilisearch' },
      { label: 'Data', tech: 'Postgres' },
    ],
  },
  {
    slug: 'stellar-freight-co',
    name: 'Stellar Freight Co.',
    tint: ['#a78bfa', '#6366f1'],
    layers: [
      { label: 'Client', tech: 'React + Zustand' },
      { label: 'Protocol', tech: 'Zod wire schemas' },
      { label: 'Server', tech: 'Fastify tick sim' },
      { label: 'Deploy', tech: 'Fly.io' },
    ],
  },
  {
    slug: 'auroratrader',
    name: 'AuroraTrader',
    tint: ['#06b6d4', '#10b981'],
    layers: [
      { label: 'Dashboard', tech: 'React + Recharts' },
      { label: 'API', tech: 'Express' },
      { label: 'Agent', tech: 'Claude → Ollama' },
      { label: 'Data', tech: 'MongoDB' },
    ],
  },
  {
    slug: 'cloudflare-ddns',
    name: 'Cloudflare DDNS',
    tint: ['#f6821f', '#0051ff'],
    layers: [
      { label: 'Dashboard', tech: 'Flask' },
      { label: 'State', tech: 'status.json' },
      { label: 'Daemon', tech: 'Python poller' },
      { label: 'Upstream', tech: 'Cloudflare API' },
    ],
  },
  {
    slug: 'agendash-3',
    name: 'Agendash 3',
    tint: ['#667eea', '#38ef7d'],
    layers: [
      { label: 'UI', tech: 'Bootstrap' },
      { label: 'Middleware', tech: 'Express · Koa · Fastify +1' },
      { label: 'Scheduler', tech: 'Agenda.js' },
      { label: 'Logs', tech: 'MongoDB tasklogs' },
    ],
  },
  {
    slug: 'openai-cost-calculator',
    name: 'OpenAI Cost Calculator',
    tint: ['#10a37f', '#0b4f43'],
    layers: [
      { label: 'Package', tech: 'npm module' },
      { label: 'API', tech: 'Five cost functions' },
      { label: 'Pricing', tech: 'Model price table' },
      { label: 'Models', tech: 'GPT-4o · Embeddings · Whisper' },
    ],
  },
  {
    slug: 'original-portfolio',
    name: 'Original Portfolio',
    tint: ['#ff8a6a', '#ffb88a'],
    layers: [
      { label: 'Markup', tech: 'HTML' },
      { label: 'Style', tech: 'CSS' },
      { label: 'Script', tech: 'Vanilla JS' },
      { label: 'Extras', tech: 'Particles.js · Swiper' },
    ],
  },
  {
    slug: 'tic-tac-toe-vs-ai',
    name: 'Tic-Tac-Toe vs AI',
    tint: ['#3b82f6', '#ef4444'],
    layers: [
      { label: 'UI', tech: 'WinForms' },
      { label: 'Engine', tech: 'C#' },
      { label: 'AI', tech: 'Minimax' },
      { label: 'Speed', tech: 'Alpha-beta pruning' },
    ],
  },
  {
    slug: 'battleship-vs-ai',
    name: 'Battleship vs AI',
    tint: ['#1e3a8a', '#64748b'],
    layers: [
      { label: 'UI', tech: 'WinForms' },
      { label: 'Engine', tech: '.NET 6' },
      { label: 'AI', tech: 'Hunt / target' },
      { label: 'Board', tech: '10×10 grid' },
    ],
  },
]

const engineProjects = PROJECTS.map((p) => ({ name: p.name, layers: p.layers }))

export default function CubeDemo() {
  return (
    <div className="cube-demo">
      <header className="cube-demo-head">
        <p>TechCube dev harness — {PROJECTS.length} projects, scroll to turn</p>
      </header>
      {PROJECTS.map((p, i) => (
        <section className="cube-demo-slot-row" key={p.slug} aria-label={p.name}>
          <p className="cube-demo-label">
            {String(i + 1).padStart(2, '0')} · {p.name}
          </p>
          <div className="cube-demo-slot">
            <TechCube projects={engineProjects} index={i} stopKey={`project:${p.slug}`} tint={p.tint} />
          </div>
        </section>
      ))}
      <footer className="cube-demo-foot">
        <p>End of demo.</p>
      </footer>
    </div>
  )
}
