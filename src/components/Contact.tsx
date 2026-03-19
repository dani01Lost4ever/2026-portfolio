export default function Contact() {
  return (
    <section className="contact section" id="contact">
      <div className="container contact-inner">
        <p className="section-label reveal">Get in Touch</p>

        <h2 className="contact-heading reveal d1">
          Let's build something<br />
          <span className="accent">great together.</span>
        </h2>

        <p className="contact-sub reveal d2">
          Currently open to freelance projects and full-time opportunities.
        </p>

        <a href="mailto:hello@yourname.com" className="contact-email reveal d3">
          hello@yourname.com
        </a>

        <div className="contact-socials reveal d4">
          <a href="#" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="#" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="#" target="_blank" rel="noopener noreferrer">Twitter</a>
          <a href="#" target="_blank" rel="noopener noreferrer">Dribbble</a>
        </div>

        <p className="contact-copy">© 2026 Your Name. All rights reserved.</p>
      </div>
    </section>
  )
}
