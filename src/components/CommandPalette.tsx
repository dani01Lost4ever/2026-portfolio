/**
 * CommandPalette — ⌘K / Ctrl+K quick jump: projects, page sections, links.
 *
 * A modal dialog around cmdk's list. In-page jumps go through the field's
 * smooth scroll (useSectionJump); the dialog locks page scroll while open,
 * traps Tab inside itself and returns focus to where it was on close.
 */

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { useContact } from '../context/content-hooks'
import { useOrderedProjects } from './useOrderedProjects'
import { useSectionJump } from './useSectionJump'

interface Props {
  open: boolean
  onClose: () => void
}

const SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
] as const

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
  const { projects } = useOrderedProjects()
  const contact = useContact()
  const { jump } = useSectionJump()
  const panelRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="cmd" data-lenis-prevent onKeyDown={onKeyDown}>
      <div className="cmd-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="cmd-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Quick navigation">
        <Command label="Quick navigation" loop filter={rank}>
          <div className="cmd-input-row">
            <svg className="cmd-search" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" />
            </svg>
            <Command.Input className="cmd-input" placeholder="Search projects or jump to a section" autoFocus />
            <button type="button" className="cmd-close" onClick={onClose}>Close</button>
          </div>

          <Command.List className="cmd-list">
            <Command.Empty className="cmd-empty">Nothing matches that.</Command.Empty>

            <Command.Group heading="Projects" className="cmd-group">
              {projects.map(p => (
                <Command.Item
                  key={p.slug}
                  value={p.title}
                  keywords={[p.subtitle]}
                  className="cmd-item"
                  onSelect={() => run(() => navigate(`/project/${p.slug}`))}
                >
                  <span className="cmd-item-title">{p.title}</span>
                  <span className="cmd-item-sub">{p.subtitle}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Sections" className="cmd-group">
              {SECTIONS.map(s => (
                <Command.Item key={s.id} value={s.label} keywords={['section', 'go to']} className="cmd-item" onSelect={() => run(() => jump(s.id))}>
                  <span className="cmd-item-title">{s.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Links" className="cmd-group">
              <Command.Item
                value="Send an email"
                keywords={['mail', 'contact', contact.email]}
                className="cmd-item"
                onSelect={() => run(() => { window.location.href = `mailto:${contact.email}` })}
              >
                <span className="cmd-item-title">Send an email</span>
                <span className="cmd-item-sub">{contact.email}</span>
              </Command.Item>
              {socials.map(s => (
                <Command.Item
                  key={s.label}
                  value={s.label}
                  className="cmd-item"
                  onSelect={() => run(() => { window.open(s.href, '_blank', 'noopener,noreferrer') })}
                >
                  <span className="cmd-item-title">{s.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
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
