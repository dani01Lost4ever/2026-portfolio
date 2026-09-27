/**
 * ProjectSheet — the optional way through all the work. A sheet grows out of the tile that
 * opened it (the poster keeps filling it, then gives way to the text), arrows push through
 * every project, and closing folds it back into that project's tile, or into the button that
 * opened it when the project has no tile. The film stays paused underneath.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { linkLabel } from '../components/projectMeta'
import type { TakeProject } from './engine/content'
import { clamp, lerp, sprMs } from './engine/math'
import { Poster } from './Poster'
import { trapTab, useSheetMotion, type SheetFrame, type SheetFrom } from './useSheetMotion'

interface Props {
  projects: TakeProject[]
  index: number
  from: SheetFrom
  /** Where to fold into when closing with this project on screen. */
  closeTo(index: number): SheetFrom
  onClosed(): void
  /** The lead project's "watch it in the film": close, then play the film to the case. */
  onWatchCase(): void
}

interface Nav { cur: number; prev: number; dir: number; at: number }

export default function ProjectSheet({ projects, index, from, closeTo, onClosed, onWatchCase }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [nav, setNav] = useState<Nav>({ cur: index, prev: -1, dir: 1, at: -1e9 })
  const navRef = useRef(nav)
  const afterRef = useRef<(() => void) | null>(null)
  useEffect(() => { navRef.current = nav }, [nav])

  const render = ({ p, R, S, now, openedAt }: SheetFrame) => {
    const root = sheetRef.current
    if (!root) return
    const n = navRef.current, mob = window.innerWidth < 760, pc = clamp(p)
    const pw = mob ? R.w : lerp(R.w, S.w * 0.44, pc), ph = mob ? lerp(R.h, S.h * 0.34, pc) : R.h
    const bx = mob ? 0 : R.w - S.w * 0.56, by = mob ? ph : 0, bw = mob ? R.w : S.w * 0.56, bh = mob ? R.h - ph : R.h
    const q = sprMs(now, n.at, 0.5, 0.96), pushing = q < 0.999
    const box = (el: HTMLElement | null, x: number, y: number, w: number, h: number, dx = 0) => {
      if (!el) return
      el.style.transform = `translate(${x}px,${y}px)` + (dx ? ` translateX(${dx}%)` : '')
      el.style.width = w + 'px'; el.style.height = h + 'px'
    }
    box(root.querySelector('[data-col="poster"]'), 0, 0, pw, ph)
    box(root.querySelector('[data-col="body"]'), bx, by, bw, bh)
    for (const col of ['poster', 'body']) {
      const w = col === 'poster' ? pw : bw, h = col === 'poster' ? ph : bh
      box(root.querySelector(`[data-col="${col}"] [data-pane="cur"]`), 0, 0, w, h, n.dir * (1 - q) * 100)
      const old = root.querySelector<HTMLElement>(`[data-col="${col}"] [data-pane="prev"]`)
      if (old) { old.style.display = pushing ? '' : 'none'; box(old, 0, 0, w, h, -n.dir * q * 100) }
    }
    const bar = root.querySelector<HTMLElement>('.vnavbar')
    if (bar) {
      bar.style.left = (mob ? 0 : bx) + 'px'; bar.style.width = bw + 'px'
      bar.style.transform = `translateY(${((1 - sprMs(now, openedAt + 260, 0.45, 0.9)) * 110).toFixed(2)}%)`
    }
    // the copy rises out of its lines once the sheet has mostly opened (not again on a push)
    root.querySelectorAll<HTMLElement>('[data-col="body"] [data-pane="cur"] .vl > div').forEach((b, j) => {
      const r = n.at > openedAt ? 1 : sprMs(now, openedAt + 230 + j * 45, 0.45, 0.88)
      b.style.transform = `translateY(${((1 - r) * 110).toFixed(2)}%)`
    })
  }

  const motion = useSheetMotion(sheetRef, scrimRef, from, render, () => { onClosed(); afterRef.current?.() })

  // focus the close button on open, give it back to the opener on close
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }) }
  }, [])
  // a push replaces the pane that may hold focus: keep focus inside the sheet
  useEffect(() => {
    const a = document.activeElement
    if (!a || a === document.body || !sheetRef.current?.contains(a)) closeRef.current?.focus({ preventScroll: true })
  }, [nav.cur])

  const go = (d: number) => setNav(n => ({ cur: (n.cur + d + projects.length) % projects.length, prev: n.cur, dir: d, at: performance.now() }))
  const close = () => motion.close(closeTo(navRef.current.cur))
  const watch = () => { afterRef.current = onWatchCase; close() }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowRight' && !isField(e.target)) { e.preventDefault(); go(1) }
    else if (e.key === 'ArrowLeft' && !isField(e.target)) { e.preventDefault(); go(-1) }
    else trapTab(e, sheetRef.current)
  }

  const cur = projects[Math.min(nav.cur, projects.length - 1)]
  const prevP = projects[(nav.cur + projects.length - 1) % projects.length]
  const nextP = projects[(nav.cur + 1) % projects.length]
  const titleId = `vt-${cur.slug}`

  return (
    <div className="tk-sheets" onKeyDown={onKeyDown} data-take-prevent>
      <div className="vscrim" ref={scrimRef} onClick={close} aria-hidden="true" />
      <div className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="vcol" data-col="poster" aria-hidden="true">
          {nav.prev >= 0 && projects[nav.prev] && <div className="vposter" data-pane="prev" key={`pp${nav.prev}`}><Poster shape={projects[nav.prev].shape} /></div>}
          <div className="vposter" data-pane="cur" key={`pc${nav.cur}`}><Poster shape={cur.shape} /></div>
        </div>
        <div className="vcol" data-col="body">
          {nav.prev >= 0 && projects[nav.prev] && <div className="vbody" data-pane="prev" key={`bp${nav.prev}`} aria-hidden="true" inert><Body p={projects[nav.prev]} i={nav.prev} n={projects.length} /></div>}
          <div className="vbody" data-pane="cur" key={`bc${nav.cur}`}>
            <Body p={cur} i={nav.cur} n={projects.length} titleId={titleId} onWatch={nav.cur === 0 ? watch : undefined} />
          </div>
        </div>
        <div className="vnavbar">
          <button type="button" className="vnav" onClick={() => go(-1)}>← {prevP.n} {prevP.title}</button>
          <button type="button" className="vnav" onClick={() => go(1)}>{nextP.n} {nextP.title} →</button>
        </div>
        <button type="button" className="vclose" ref={closeRef} onClick={close} aria-label="Close">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
        </button>
      </div>
    </div>
  )
}

function Body({ p, i, n, titleId, onWatch }: { p: TakeProject; i: number; n: number; titleId?: string; onWatch?: () => void }) {
  return (
    <>
      <div className="vl"><div className="vk">{p.n} / {String(n).padStart(2, '0')} · {p.year} · {p.role}</div></div>
      <div className="vl"><div><h2 className="vt" id={titleId}>{p.title}</h2></div></div>
      <div className="vl"><div><p className="vs">{p.sub}</p></div></div>
      <div className="vl"><div><p className="vd">{p.description}</p></div></div>
      {p.results.length > 0 && (
        <div className="vl"><div><dl className="vres">{p.results.map(r => <div key={r.label}><dt>{r.value}</dt><dd>{r.label}</dd></div>)}</dl></div></div>
      )}
      {p.tags.length > 0 && <div className="vl"><div><ul className="vtags" aria-label="Technologies">{p.tags.map(x => <li key={x}>{x}</li>)}</ul></div></div>}
      <div className="vl"><div className="vacts">
        <Link className="vbtn" to={`/project/${p.slug}`}>Full case study →</Link>
        {p.link && <a className="vbtn o" href={p.link} target="_blank" rel="noopener noreferrer">{linkLabel(p.link)} ↗<span className="sr-only"> (opens in a new tab)</span></a>}
        {onWatch && i === 0 && <button type="button" className="vbtn o" onClick={onWatch}>Watch it in the film ↓</button>}
      </div></div>
    </>
  )
}

const isField = (t: EventTarget) => t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
