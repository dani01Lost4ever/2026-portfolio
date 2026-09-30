/**
 * PrototypeViewer — one prototype from the gallery, running live.
 *
 * The head sets the title, meta, description and stack. Below it the prototype
 * runs in a browser frame at a real device width (desktop 1440, tablet 834,
 * phone 390 CSS px), scaled down to fit the page, so its own breakpoints apply
 * the way they would on that screen. A prototype that can't be framed shows its
 * picture and a way out instead. Previous/next cards step through the gallery.
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { usePrototypes } from '../context/content-hooks'
import { canEmbed, displayUrl, listPrototypes, prototypeNumber, prototypePath } from '../lib/prototypes'
import type { Prototype } from '../lib/types'
import { ArrowLeft, ArrowRight, ArrowUpRight } from '../components/Icons'
import PageHeader from '../components/PageHeader'
import { BrowserBar, PrototypeShot } from '../components/PrototypeFrame'
import SiteFooter from '../components/SiteFooter'

const DEVICES = [
  { id: 'desktop', label: 'Desktop', w: 1440, h: 900 },
  { id: 'tablet', label: 'Tablet', w: 834, h: 1112 },
  { id: 'phone', label: 'Phone', w: 390, h: 844 },
] as const

type DeviceId = (typeof DEVICES)[number]['id']

/** The frame's address bar, in CSS px (.pf-bar). */
const BAR = 34
/** Viewport height the frame leaves free: the sticky header and a margin around the stage. */
const CHROME_Y = 132

const defaultDevice = (): DeviceId => (window.innerWidth < 700 ? 'phone' : 'desktop')

export default function PrototypeViewer() {
  const { slug } = useParams()
  const { items } = usePrototypes()
  const list = useMemo(() => listPrototypes(items), [items])
  // kept here, not in the stage, so previous/next keeps the size you're comparing at
  const [deviceId, setDeviceId] = useState<DeviceId>(defaultDevice)

  const index = list.findIndex(p => p.slug === slug)
  const p = index >= 0 ? list[index] : undefined
  if (!p) return <Navigate to="/prototypes" replace />

  const prev = list.length > 1 ? list[(index - 1 + list.length) % list.length] : null
  const next = list.length > 1 ? list[(index + 1) % list.length] : null
  const meta = [prototypeNumber(index), p.year, p.kind].filter(Boolean)
  const description = p.description || `${p.title}, a site prototype by Daniel Busetto.`

  return (
    <>
      <Helmet>
        <title>{`${p.title}, a prototype by Daniel Busetto`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={`${p.title}, a prototype`} />
        <meta property="og:description" content={description} />
      </Helmet>

      <PageHeader />

      <main id="main" tabIndex={-1} className="pv">
        <section className="pv-head" id="top" aria-labelledby="pv-title">
          <div className="pv-name">
            <Link to="/prototypes" className="pd-back">
              <ArrowLeft /> All prototypes
            </Link>
            <div className="pg-meta">
              <p className="pd-kicker">{meta.map((m, i) => <span key={i}>{m}</span>)}</p>
              {p.status && <span className="pg-status">{p.status}</span>}
            </div>
            <h1 id="pv-title" className="pd-title">{p.title}</h1>
          </div>
          <div className="pv-about">
            {p.description && <p className="pd-desc">{p.description}</p>}
            {p.stack.length > 0 && (
              <ul className="pd-tags" aria-label="Built with">
                {p.stack.map(t => <li key={t}>{t}</li>)}
              </ul>
            )}
          </div>
        </section>

        <PrototypeStage key={p.slug} p={p} deviceId={deviceId} onDevice={setDeviceId} />

        {prev && next && (
          <nav className="pd-nav pv-nav" aria-label="More prototypes">
            <Link to={prototypePath(prev)} className="pd-card" rel="prev">
              <PrototypeShot p={prev} className="pd-card-poster pv-card-shot" />
              <span className="pd-card-text">
                <span className="pd-card-dir"><ArrowLeft /> Previous prototype</span>
                <span className="pd-card-title">{prev.title}</span>
                {prev.kind && <span className="pd-card-sub">{prev.kind}</span>}
              </span>
            </Link>
            <Link to={prototypePath(next)} className="pd-card" rel="next">
              <PrototypeShot p={next} className="pd-card-poster pv-card-shot" />
              <span className="pd-card-text">
                <span className="pd-card-dir">Next prototype <ArrowRight /></span>
                <span className="pd-card-title">{next.title}</span>
                {next.kind && <span className="pd-card-sub">{next.kind}</span>}
              </span>
            </Link>
          </nav>
        )}
      </main>

      <SiteFooter />
    </>
  )
}

interface StageProps {
  p: Prototype
  deviceId: DeviceId
  onDevice(id: DeviceId): void
}

/** The live preview: device switch, the frame at that device's size, and the way out to the prototype itself. */
function PrototypeStage({ p, deviceId, onDevice }: StageProps) {
  const fitRef = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState({ w: 0, h: 0 })
  const [ready, setReady] = useState(false)
  const device = DEVICES.find(d => d.id === deviceId) ?? DEVICES[0]
  const live = canEmbed(p)

  // the room the frame may take: the stage's width, and the viewport's height under the header
  // (the small viewport's, so a phone's toolbar sliding away while you scroll doesn't rescale it)
  useLayoutEffect(() => {
    const el = fitRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth, h = Math.max(320, document.documentElement.clientHeight - CHROME_Y)
      setRoom(r => (r.w === w && r.h === h ? r : { w, h }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const scale = room.w ? Math.min(1, room.w / device.w, (room.h - BAR) / device.h) : 0
  const url = displayUrl(p.url) || p.slug

  return (
    <section className="pv-stage-wrap" aria-label="Live preview">
      <div className="pv-toolbar">
        {live && (
          <div className="pv-seg" role="group" aria-label="Preview size">
            {DEVICES.map(d => (
              <button key={d.id} type="button" aria-pressed={d.id === deviceId} onClick={() => onDevice(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
        )}
        {live && scale > 0 && (
          <span className="pv-size">
            {device.w} × {device.h}{scale < 1 ? ` · ${Math.round(scale * 100)}%` : ''}
          </span>
        )}
        {p.url && (
          <a className="btn btn-ghost pv-out" href={p.url} target="_blank" rel="noopener noreferrer">
            Open in a new tab <ArrowUpRight />
          </a>
        )}
      </div>

      <div className="pv-stage">
        <div className="pv-fit" ref={fitRef}>
          {live ? (
            scale > 0 && (
              <div className="pf pv-frame" style={{ width: Math.floor(device.w * scale) }}>
                <BrowserBar url={url} />
                <div className={'pv-view' + (ready ? ' ready' : '')} style={{ height: Math.floor(device.h * scale) }}>
                  {!ready && (device.id === 'desktop'
                    ? <PrototypeShot p={p} className="pv-shot" />
                    : <p className="pv-loading">Loading {p.title}…</p>)}
                  <iframe
                    src={p.url}
                    title={`${p.title}, live prototype`}
                    style={{ width: device.w, height: device.h, transform: `scale(${scale})` }}
                    onLoad={() => setReady(true)}
                  />
                </div>
              </div>
            )
          ) : (
            <div className="pf pv-frame pv-still">
              <BrowserBar url={url} />
              <div className="pv-view">
                <PrototypeShot p={p} className="pv-shot" />
                <p className="pv-note">{p.url ? 'This one runs on its own site.' : 'Not online yet.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
