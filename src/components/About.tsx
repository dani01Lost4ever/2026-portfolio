import aboutData from '../data/about.json'

export default function About() {
  return (
    <section className="about section" id="about">
      <div className="container">
        <div className="about-inner">
          <div className="about-bio">
            <p className="section-label reveal">{aboutData.label}</p>
            <h2 className="about-heading reveal d1">
              {aboutData.heading}
            </h2>
            <div className="about-text reveal d2">
              {aboutData.bio.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="about-skills reveal d2">
            {aboutData.skills.map(s => (
              <div key={s.category} className="skill-group">
                <h4 className="skill-category">{s.category}</h4>
                <ul className="skill-list">
                  {s.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
