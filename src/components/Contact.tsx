import { useState } from 'react'
import { useContact } from '../context/ContentContext'
import { sendMessage, type MessagePayload } from '../lib/api'

type Status = 'idle' | 'sending' | 'success' | 'error'

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

  return (
    <section className="contact section" id="contact">
      <div className="container contact-inner">
        <p className="section-label reveal">{contact.label}</p>

        <h2 className="contact-heading reveal d1">
          {contact.heading}<br />
          <span className="accent">{contact.headingAccent}</span>
        </h2>

        <p className="contact-sub reveal d2">{contact.availability}</p>

        <a href={`mailto:${contact.email}`} className="contact-email reveal d3">
          {contact.email}
        </a>

        {/* Contact form */}
        <form className="contact-form reveal d4" onSubmit={handleSubmit} noValidate>
          <div className="contact-form-row">
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
                disabled={status === 'sending' || status === 'success'}
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
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                disabled={status === 'sending' || status === 'success'}
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
              placeholder="Tell me about your project…"
              rows={5}
              value={form.message}
              onChange={handleChange}
              disabled={status === 'sending' || status === 'success'}
            />
          </div>

          {status === 'success' ? (
            <div className="form-success">
              <span className="form-success-icon">✓</span>
              Message sent — I'll be in touch soon.
            </div>
          ) : (
            <button
              type="submit"
              className="btn btn-primary form-submit"
              disabled={status === 'sending' || !form.name || !form.email || !form.message}
            >
              {status === 'sending' ? 'Sending…' : 'Send Message'}
            </button>
          )}

          {status === 'error' && (
            <p className="form-error">Something went wrong. Try emailing me directly.</p>
          )}
        </form>

        <div className="contact-socials reveal">
          {contact.socials.map(social => (
            <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">
              {social.label}
            </a>
          ))}
        </div>

        <p className="contact-copy">{contact.copyright}</p>
      </div>
    </section>
  )
}
