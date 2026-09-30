/**
 * CommandPalette — ⌘K / Ctrl+K quick jump: projects, film chapters, prototypes, links.
 *
 * A modal dialog around cmdk's list. Section jumps glide the film to its
 * chapter (useSectionJump); the dialog locks page scroll while open,
 * traps Tab inside itself and returns focus to where it was on close.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { useContact, useProjects, usePrototypes } from '../context/content-hooks'
import { listPrototypes, prototypePath } from '../lib/prototypes'
import { useSectionJump } from './useSectionJump'

interface Props {
  open: boolean
  onClose: () => void
}

/** The film's chapters, in the order they play. */
const SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'case', label: 'Case study' },
  { id: 'now', label: 'Now' },
  { id: 'experience', label: 'Experience' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
] as const

interface Entry {
  key: string
  value: string
  keywords?: string[]
  title: string
  sub?: string
  run: () => void
}

interface Group {
  heading: string
  items: Entry[]
}

/** Title matches first (word starts beat substrings), then keyword matches; no loose fuzzy hits. */
function rank(value: string, search: string, keywords?: string[]): number {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const v = value.toLowerCase()
  if (v.startsWith(q)) return 1
  if (v.split(/\s+/).some(w => w.startsWith(q))) return 0.9
  if (v.includes(q)) return 0.8
  const k = (keywords ?? []).join(' ').toLowerCase()
  if (k.split(/\s+/).some(w => w.startsWith(q))) return 0.5
  return k.includes(q) ? 0.4 : 0
}

export default function CommandPalette({ open, onClose }: Props) {
  if (!open) return null
  return <PaletteDialog onClose={onClose} />
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const allProjects = useProjects()
  const projects = useMemo(() => [...allProjects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [allProjects])
  const { items } = usePrototypes()
  const prototypes = useMemo(() => listPrototypes(items), [items])
  const contact = useContact()
  const { jump } = useSectionJump()
  const panelRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')

  // Lock page scroll and restore focus on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const root = document.documentElement
    const prevOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prevOverflow
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panelRef.current) return
    const focusables = panelRef.current.querySelectorAll<HTMLElement>('input, button, [href], [tabindex]:not([tabindex="-1"])')
    if (!focusables.length) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  function run(action: () => void) {
    onClose()
    // let the dialog unmount (and scroll unlock) before moving
    requestAnimationFrame(action)
  }

  const socials = contact.socials.filter(s => s.href && s.href !== '#')

  const groups: Group[] = [
    {
      heading: 'Projects',
      items: projects.map(p => ({
        key: p.slug, value: p.title, keywords: [p.subtitle], title: p.title, sub: p.subtitle,
        run: () => navigate(`/project/${p.slug}`),
      })),
    },
    {
      heading: 'Chapters',
      items: SECTIONS.map(s => ({ key: s.id, value: s.label, keywords: ['section', 'go to'], title: s.label, run: () => jump(s.id) })),
    },
    {
      heading: 'Prototypes',
      items: prototypes.length === 0 ? [] : [
        {
          key: 'all', value: 'All prototypes', keywords: ['gallery', 'prototype', 'designs', 'concepts'], title: 'All prototypes',
          sub: prototypes.length === 1 ? '1 site' : `${prototypes.length} sites`,
          run: () => navigate('/prototypes'),
        },
        ...prototypes.map(p => ({
          key: p.slug, value: `${p.title} prototype`, keywords: [p.kind, ...p.stack], title: p.title, sub: p.kind || 'Prototype',
          run: () => navigate(prototypePath(p)),
        })),
      ],
    },
    {
      heading: 'Links',
      items: [
        {
          key: 'email', value: 'Send an email', keywords: ['mail', 'contact', contact.email], title: 'Send an email', sub: contact.email,
          run: () => window.location.assign(`mailto:${contact.email}`),
        },
        ...socials.map(s => ({ key: s.label, value: s.label, title: s.label, run: () => { window.open(s.href, '_blank', 'noopener,noreferrer') } })),
      ],
    },
  ]
  // cmdk sorts the items inside a group but leaves the groups in document order, so the group
  // with the best match goes first (a prototype's title beats a project's subtitle); ties keep this order
  const ordered = groups
    .map((g, i) => ({ ...g, i, best: Math.max(0, ...g.items.map(it => rank(it.value, search, it.keywords))) }))
    .filter(g => g.items.length > 0)
    .sort((a, b) => b.best - a.best || a.i - b.i)

  return (
    <div className="cmd" data-take-prevent onKeyDown={onKeyDown}>
      <div className="cmd-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="cmd-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Quick navigation">
        <Command label="Quick navigation" loop filter={rank}>
          <div className="cmd-input-row">
            <svg className="cmd-search" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" />
            </svg>
            <Command.Input className="cmd-input" placeholder="Search projects or jump to a section" autoFocus value={search} onValueChange={setSearch} />
            <button type="button" className="cmd-close" onClick={onClose}>Close</button>
          </div>

          <Command.List className="cmd-list">
            <Command.Empty className="cmd-empty">Nothing matches that.</Command.Empty>

            {ordered.map(g => (
              <Command.Group key={g.heading} heading={g.heading} className="cmd-group">
                {g.items.map(it => (
                  <Command.Item key={it.key} value={it.value} keywords={it.keywords} className="cmd-item" onSelect={() => run(it.run)}>
                    <span className="cmd-item-title">{it.title}</span>
                    {it.sub && <span className="cmd-item-sub">{it.sub}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <p className="cmd-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
            <span><kbd>Enter</kbd> open</span>
            <span><kbd>Esc</kbd> close</span>
          </p>
        </Command>
      </div>
    </div>
  )
}
