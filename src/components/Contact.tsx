import { useContact } from '../context/content-hooks'
import nowJson from '../data/now.json'
import ContactForm from './ContactForm'
import { ArrowUpRight } from './Icons'
import { STOP_BG, stopAttrs } from './fieldStops'

interface NowItem { label: string; value: string }
const now = (nowJson as { items?: NowItem[] }).items ?? []

export default function Contact() {
  const contact = useContact()
  // CMS placeholders (empty or '#') are left out rather than rendered as dead links.
  const socials = contact.socials.filter(s => s.href && s.href.trim() !== '#')

  return (
    <section
      className="contact"
      id="contact"
      aria-labelledby="contact-title"
      {...stopAttrs({ key: 'at', shape: 'at', side: 'right', bg: STOP_BG.at })}
    >
      <div className="contact-inner">
        <p className="kicker">{contact.label}</p>
        <h2 id="contact-title">{[contact.heading, contact.headingAccent].filter(Boolean).join(' ')}</h2>
        <p className="avail">{contact.availability}</p>
        <a className="btn btn-primary mail" href={`mailto:${contact.email}`}>
          {contact.email} <ArrowUpRight />
        </a>
        {socials.length > 0 && (
          <ul className="socials">
            {socials.map(s => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {now.length > 0 && (
          <dl className="now">
            {now.map(item => (
              <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
            ))}
          </dl>
        )}
        <ContactForm />
      </div>
    </section>
  )
}
