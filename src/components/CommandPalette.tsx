import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { useProjects, useContact } from '../context/ContentContext'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate  = useNavigate()
  const projects  = useProjects()
  const contact   = useContact()

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function goToSection(id: string) {
    if (window.location.pathname !== '/') {
      navigate('/')
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 320)
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
    onClose()
  }

  function goToProject(slug: string) {
    navigate(`/project/${slug}`)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="cmd-panel"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Command>
              <div className="cmd-input-row">
                <svg className="cmd-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <Command.Input className="cmd-input" placeholder="Search projects, navigate…" autoFocus />
                <kbd className="cmd-esc-key">esc</kbd>
              </div>

              <Command.List className="cmd-list">
                <Command.Empty className="cmd-empty">No results found.</Command.Empty>

                <Command.Group heading="Projects" className="cmd-group">
                  {projects.map(p => (
                    <Command.Item
                      key={p.slug}
                      className="cmd-item"
                      onSelect={() => goToProject(p.slug)}
                    >
                      <span
                        className="cmd-item-dot"
                        style={{ background: p.gradient }}
                      />
                      <span className="cmd-item-title">{p.title}</span>
                      <span className="cmd-item-sub">{p.subtitle}</span>
                      <span className="cmd-item-arrow">→</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Separator className="cmd-sep" />

                <Command.Group heading="Navigate" className="cmd-group">
                  {(['work', 'about', 'contact'] as const).map(id => (
                    <Command.Item
                      key={id}
                      className="cmd-item"
                      onSelect={() => goToSection(id)}
                    >
                      <span className="cmd-item-icon">#</span>
                      <span className="cmd-item-title" style={{ textTransform: 'capitalize' }}>{id}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Separator className="cmd-sep" />

                <Command.Group heading="Links" className="cmd-group">
                  <Command.Item
                    className="cmd-item"
                    onSelect={() => { window.location.href = `mailto:${contact.email}`; onClose() }}
                  >
                    <span className="cmd-item-icon">✉</span>
                    <span className="cmd-item-title">Send Email</span>
                    <span className="cmd-item-sub">{contact.email}</span>
                  </Command.Item>
                  {contact.socials.map(s => (
                    <Command.Item
                      key={s.label}
                      className="cmd-item"
                      onSelect={() => { window.open(s.href, '_blank'); onClose() }}
                    >
                      <span className="cmd-item-icon">↗</span>
                      <span className="cmd-item-title">{s.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>

              <div className="cmd-footer">
                <span><kbd>↑↓</kbd> Navigate</span>
                <span><kbd>↵</kbd> Select</span>
                <span><kbd>esc</kbd> Close</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
