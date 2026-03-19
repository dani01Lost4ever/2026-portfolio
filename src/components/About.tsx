const skills = [
  {
    category: 'Frontend',
    items: ['React', 'TypeScript', 'Vue.js', 'CSS / Sass', 'Framer Motion'],
  },
  {
    category: 'Backend',
    items: ['Node.js', 'Express', 'PostgreSQL', 'REST / GraphQL'],
  },
  {
    category: 'Design',
    items: ['Figma', 'Design Systems', 'Prototyping', 'User Research'],
  },
  {
    category: 'Tools',
    items: ['Git', 'Docker', 'CI/CD', 'Vite', 'Storybook'],
  },
]

export default function About() {
  return (
    <section className="about section" id="about">
      <div className="container">
        <div className="about-inner">
          <div className="about-bio">
            <p className="section-label reveal">About Me</p>
            <h2 className="about-heading reveal d1">
              Bridging the gap between design and engineering.
            </h2>
            <div className="about-text reveal d2">
              <p>
                I'm a full-stack developer and designer with 5+ years of experience building
                digital products that people love to use. I care deeply about both the technical
                foundations and the resulting user experience.
              </p>
              <p>
                When I'm not writing code, I'm usually experimenting with new design tools,
                contributing to open source, or exploring the outdoors.
              </p>
            </div>
          </div>

          <div className="about-skills reveal d2">
            {skills.map(s => (
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
