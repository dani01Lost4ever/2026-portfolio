/**
 * Contact — direct-address letter form with animated send feedback.
 *
 * Sending state: the Send button's arrow morphs into a spinning ring,
 * the label changes to "Sending", inputs lock.
 *
 * Success state: form fields fade-up out of the way and a success card
 * springs into place. The checkmark draws itself in two strokes
 * (circle, then tick), giving the visitor a small celebratory moment
 * without being theatrical.
 */

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useContact } from '../context/ContentContext'
import { sendMessage, type MessagePayload } from '../lib/api'

type Status = 'idle' | 'sending' | 'success' | 'error'

const EASE = [0.16, 1, 0.3, 1] as const

function AnimatedCheck() {
  return (
    <svg
      className="form-success-check"
      viewBox="0 0 48 48"
      width="56"
      height="56"
      aria-hidden
    >
      <motion.circle
        cx="24"
        cy="24"
        r="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0.6 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: EASE }}
      />
      <motion.path
        d="M14 24 L22 32 L34 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.42, delay: 0.42, ease: EASE }}
      />
    </svg>
  )
}

function SendingSpinner() {
  return (
    <svg
      className="form-spinner"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="14 36"
      />
    </svg>
  )
}

export default function Contact() {
  const contact = useContact()

  const [form, setForm]     = useState<MessagePayload>({ name: '', email: '', message: '' })
  const [status, setStatus] = useState<Status>('idle')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setStatus('sending')
    try {
      await sendMessage(form)
      setStatus('success')
      setForm({ name: '', email: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const locked = status === 'sending' || status === 'success'

  return (
    <section className="contact section" id="contact">
      <div className="container">
        <header className="contact-head reveal">
          <span className="contact-eyebrow">
            <span className="contact-eyebrow-num">05</span>
            Mail
          </span>
          <span className="contact-rule" aria-hidden />
          <span className="contact-meta">{contact.availability}</span>
        </header>

        <h2 className="contact-heading reveal d1">
          Let's build something<br />
          <span className="contact-heading-accent">great together.</span>
        </h2>

        <a
          href={`mailto:${contact.email}`}
          className="contact-email reveal d2"
        >
          {contact.email}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>

        <div className="contact-body">
          <form className="contact-form reveal d3" onSubmit={handleSubmit} noValidate>
            <div className="contact-form-intro">
              <span className="contact-form-label">Or write a short note</span>
              <span className="contact-form-rule" aria-hidden />
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {status === 'success' ? (
                <motion.div
                  key="success"
                  className="form-success-card"
                  initial={{ opacity: 0, y: 28, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <AnimatedCheck />
                  <div className="form-success-text">
                    <motion.h3
                      className="form-success-heading"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.55, ease: EASE }}
                    >
                      Message sent.
                    </motion.h3>
                    <motion.p
                      className="form-success-sub"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7, ease: EASE }}
                    >
                      I'll get back to you within a day or two.
                    </motion.p>
                    <motion.button
                      type="button"
                      className="form-success-reset"
                      onClick={() => setStatus('idle')}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.85, ease: EASE }}
                    >
                      Send another
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 3v6h-6" />
                        <path d="M3 9a9 9 0 0 1 15-3.5L21 9" />
                      </svg>
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form-body"
                  className="form-fields"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -12, transition: { duration: 0.3, ease: EASE } }}
                >
                  <div className="contact-form-grid">
                    <div className="form-field">
                      <label className="form-label" htmlFor="cf-name">Name</label>
                      <input
                        id="cf-name"
                        name="name"
                        type="text"
                        className="form-input"
                        placeholder="Your name"
                        value={form.name}
                        onChange={handleChange}
                        disabled={locked}
                        autoComplete="name"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="cf-email">Email</label>
                      <input
                        id="cf-email"
                        name="email"
                        type="email"
                        className="form-input"
                        placeholder="you@domain.com"
                        value={form.email}
                        onChange={handleChange}
                        disabled={locked}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="cf-message">Message</label>
                    <textarea
                      id="cf-message"
                      name="message"
                      className="form-textarea"
                      placeholder="What are you building?"
                      rows={4}
                      value={form.message}
                      onChange={handleChange}
                      disabled={locked}
                    />
                  </div>

                  <button
                    type="submit"
                    className={`btn btn-primary form-submit${status === 'sending' ? ' is-sending' : ''}`}
                    disabled={status === 'sending' || !form.name || !form.email || !form.message}
                  >
                    <span className="form-submit-label">
                      {status === 'sending' ? 'Sending' : 'Send'}
                    </span>
                    {status === 'sending' ? (
                      <SendingSpinner />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>

                  <AnimatePresence>
                    {status === 'error' && (
                      <motion.p
                        key="error"
                        className="form-error"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{
                          opacity: 1,
                          x: [0, -8, 8, -6, 6, -3, 3, 0],
                          transition: {
                            opacity: { duration: 0.2 },
                            x: { duration: 0.4, ease: 'easeOut' },
                          },
                        }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      >
                        Something went wrong. Try the email link above.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        <footer className="contact-footer reveal">
          <ul className="contact-socials">
            {contact.socials.map(social => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noopener noreferrer">
                  {social.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>

          <p className="contact-copy">{contact.copyright}</p>
        </footer>
      </div>
    </section>
  )
}
