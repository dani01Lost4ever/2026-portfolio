export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero-glow" />
      <div className="hero-glow-2" />

      <div className="container hero-inner">
        <span className="hero-tag reveal">
          <span className="hero-tag-dot" />
          Available for work
        </span>

        <h1 className="hero-heading reveal d1">
          Building digital<br />
          products with<br />
          <span className="accent">purpose.</span>
        </h1>

        <p className="hero-subtitle reveal d2">
          I'm [Your Name], a full-stack developer and designer based in [City].
          I craft meaningful digital experiences — from interfaces to infrastructure.
        </p>

        <div className="hero-actions reveal d3">
          <a href="#work" className="btn btn-primary">View Work</a>
          <a href="#contact" className="btn btn-outline">Get in Touch</a>
        </div>
      </div>

      <div className="hero-scroll">
        <span>Scroll</span>
        <div className="hero-scroll-line" />
      </div>
    </section>
  )
}
