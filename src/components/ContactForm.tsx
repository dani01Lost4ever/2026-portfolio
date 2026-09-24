/**
 * ContactForm — the short-note form under the email CTA.
 *
 * Posts to PocketBase via sendMessage(). All three fields are required: the
 * submit button stays disabled until they are filled, and submit is a no-op
 * otherwise. States: idle → sending (inputs lock, label reads "Sending") →
 * success (confirmation replaces the fields, focus moves to it) or error
 * (inline alert, fields stay filled so nothing is lost).
 */

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { sendMessage, type MessagePayload } from '../lib/api'
import { ArrowRight } from './Icons'

type Status = 'idle' | 'sending' | 'success' | 'error'

const EMPTY: MessagePayload = { name: '', email: '', message: '' }

export default function ContactForm() {
  const [form, setForm] = useState<MessagePayload>(EMPTY)
  const [status, setStatus] = useState<Status>('idle')
  const doneRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const resetRef = useRef(false)

  useEffect(() => {
    if (status === 'success') doneRef.current?.focus()
    if (status === 'idle' && resetRef.current) {
      resetRef.current = false
      nameRef.current?.focus()
    }
  }, [status])

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) return
    setStatus('sending')
    try {
      await sendMessage(form)
      setStatus('success')
      setForm(EMPTY)
    } catch {
      setStatus('error')
    }
  }

  function sendAnother() {
    resetRef.current = true
    setStatus('idle')
  }

  const locked = status === 'sending' || status === 'success'
  const incomplete = !form.name || !form.email || !form.message

  return (
    <div className="note">
      <h3 className="note-title" id="note-title">Or write a short note</h3>

      {status === 'success' ? (
        <div className="note-done" ref={doneRef} tabIndex={-1} role="status">
          <p className="note-done-head">Message sent.</p>
          <p className="note-done-sub">I'll get back to you within a day or two.</p>
          <button type="button" className="link link-button" onClick={sendAnother}>
            Send another <ArrowRight />
          </button>
        </div>
      ) : (
        <form className="note-form" onSubmit={handleSubmit} noValidate aria-labelledby="note-title">
          <div className="note-row">
            <div className="field">
              <label htmlFor="cf-name">Name</label>
              <input
                ref={nameRef}
                id="cf-name"
                name="name"
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                disabled={locked}
                autoComplete="name"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="cf-email">Email</label>
              <input
                id="cf-email"
                name="email"
                type="email"
                placeholder="you@domain.com"
                value={form.email}
                onChange={handleChange}
                disabled={locked}
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cf-message">Message</label>
            <textarea
              id="cf-message"
              name="message"
              placeholder="What are you building?"
              rows={4}
              value={form.message}
              onChange={handleChange}
              disabled={locked}
              required
            />
          </div>
          <div className="note-actions">
            <button
              type="submit"
              className={`btn btn-ghost note-submit${status === 'sending' ? ' is-sending' : ''}`}
              disabled={status === 'sending' || incomplete}
            >
              {status === 'sending' ? 'Sending' : 'Send'}
              {status === 'sending' ? <span className="spinner" aria-hidden="true" /> : <ArrowRight />}
            </button>
            <p className="note-hint" aria-live="polite">
              {status === 'sending' ? 'Sending your message…' : incomplete ? 'All three fields are required.' : ''}
            </p>
          </div>
          {status === 'error' && (
            <p className="note-error" role="alert">Something went wrong. Try the email link above.</p>
          )}
        </form>
      )}
    </div>
  )
}
