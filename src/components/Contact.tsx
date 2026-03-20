import contactData from '../data/contact.json'

export default function Contact() {
  return (
    <section className="contact section" id="contact">
      <div className="container contact-inner">
        <p className="section-label reveal">{contactData.label}</p>

        <h2 className="contact-heading reveal d1">
          {contactData.heading}<br />
          <span className="accent">{contactData.headingAccent}</span>
        </h2>

        <p className="contact-sub reveal d2">
          {contactData.availability}
        </p>

        <a href={`mailto:${contactData.email}`} className="contact-email reveal d3">
          {contactData.email}
        </a>

        <div className="contact-socials reveal d4">
          {contactData.socials.map(social => (
            <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">
              {social.label}
            </a>
          ))}
        </div>

        <p className="contact-copy">{contactData.copyright}</p>
      </div>
    </section>
  )
}
