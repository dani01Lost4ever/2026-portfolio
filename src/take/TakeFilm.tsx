/**
 * TakeFilm — mounts the One Take engine and bridges it to the app.
 *
 * The engine owns its DOM (React only gives it an empty element) and is rebuilt when the
 * content changes, keeping its position. It asks React to open the project and contact
 * sheets; while one is open the film is paused and page scroll is locked. The chapter on
 * screen is mirrored in the URL hash, so `/#contact` is shareable and a reload lands there.
 */

import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContent } from '../context/content-hooks'
import { takeContent } from './engine/content'
import { Take } from './engine/Take'
import { CHAPTERS } from './engine/timeline'
import ContactSheet from './ContactSheet'
import ProjectSheet from './ProjectSheet'
import TakeDocument from './TakeDocument'
import { isChapterId, TakeRegistry } from './TakeContext'
import { toFrom, type SheetFrom } from './useSheetMotion'

type Sheet = { kind: 'project'; index: number; from: SheetFrom } | { kind: 'contact'; from: SheetFrom }

const FONTS = ['800 100px Archivo', 'expanded 800 100px Archivo', 'condensed 800 100px Archivo', '500 20px Geist', '600 20px Geist', '500 12px "Geist Mono"', '500 12px "Chivo Mono"']

declare global {
  interface Window { oneTake?: Take }
}

export default function TakeFilm() {
  const bundle = useContent()
  const content = useMemo(() => takeContent(bundle), [bundle])
  const register = useContext(TakeRegistry)
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Take | null>(null)
  const beatRef = useRef<number | null>(null)
  const playingRef = useRef(false)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const openRef = useRef(false)

  useEffect(() => { navigateRef.current = navigate }, [navigate])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const mount = (): Take => {
      const hash = decodeURIComponent(window.location.hash.slice(1))
      const start = beatRef.current ?? (isChapterId(hash) ? CHAPTERS.find(ch => ch.id === hash)?.beat ?? 0 : 0)
      const k = new Take(host, {
        content,
        startBeat: start,
        startPlaying: playingRef.current,
        startPaused: openRef.current,
        onOpenProject: (index, r) => { if (content.projects.length) setSheet({ kind: 'project', index, from: toFrom(r, 18) }) },
        onOpenContact: r => setSheet({ kind: 'contact', from: toFrom(r, 999) }),
        onNavigate: path => navigateRef.current(path),
        onChapter: id => {
          const hash = id === 'top' ? '' : `#${id}`
          if (window.location.hash !== hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + hash)
        },
      })
      engineRef.current = k
      register({ goToChapter: id => k.goToChapter(id) })
      if (import.meta.env.DEV) window.oneTake = k
      return k
    }
    // the engine measures type (wordmark, glass glyphs), so it waits for the fonts it draws with
    let live = true
    let k: Take | null = null
    Promise.all(FONTS.map(f => document.fonts.load(f))).catch(() => []).then(() => document.fonts.ready).then(() => {
      if (live) k = mount()
    })
    return () => {
      live = false
      if (!k) return
      beatRef.current = k.beat
      playingRef.current = k.isPlaying
      k.destroy()
      engineRef.current = null
      register(null)
      if (import.meta.env.DEV) delete window.oneTake
    }
  }, [content, register])

  // a sheet pauses the film and locks the page under it
  const open = sheet !== null
  useEffect(() => {
    openRef.current = open
    if (!open) return
    const root = document.documentElement, prev = root.style.overflow
    engineRef.current?.pause(true)
    root.style.overflow = 'hidden'
    return () => { root.style.overflow = prev; engineRef.current?.pause(false) }
  }, [open])

  const closed = () => setSheet(null)

  return (
    <>
      <div ref={hostRef} />
      <TakeDocument c={content} />
      {sheet?.kind === 'project' && (
        <ProjectSheet
          projects={content.projects}
          index={sheet.index}
          from={sheet.from}
          closeTo={i => toFrom(engineRef.current?.projectRect(i) ?? new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0), 18)}
          onClosed={closed}
          onWatchCase={() => engineRef.current?.playToCase()}
        />
      )}
      {sheet?.kind === 'contact' && (
        <ContactSheet
          email={content.email}
          availability={content.availability}
          from={sheet.from}
          closeTo={() => toFrom(engineRef.current?.contactRect() ?? new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0), 999)}
          onClosed={closed}
        />
      )}
    </>
  )
}
