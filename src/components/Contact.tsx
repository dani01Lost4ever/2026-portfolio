import { useContact } from '../context/ContentContext'

export default function Contact() {
  const contact = useContact()

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

        <div className="contact-socials reveal d4">
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
