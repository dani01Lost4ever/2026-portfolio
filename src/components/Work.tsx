const projects = [
  {
    id: '01',
    year: '2025',
    title: 'Project Alpha',
    description: 'A SaaS platform for team collaboration with real-time features and a clean, accessible interface.',
    tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    gradient: 'linear-gradient(135deg, #5465ff 0%, #9b59b6 100%)',
    link: '#',
  },
  {
    id: '02',
    year: '2025',
    title: 'E-Commerce Redesign',
    description: 'Full redesign and rebuild of an e-commerce platform, improving conversion rates and performance.',
    tags: ['Next.js', 'Tailwind', 'Stripe'],
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    link: '#',
  },
  {
    id: '03',
    year: '2024',
    title: 'Mobile Banking App',
    description: 'A modern mobile banking experience with an emphasis on clarity, speed, and security.',
    tags: ['React Native', 'TypeScript', 'REST API'],
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    link: '#',
  },
  {
    id: '04',
    year: '2024',
    title: 'Design System',
    description: 'A comprehensive design system and component library used across multiple products.',
    tags: ['Figma', 'React', 'Storybook'],
    gradient: 'linear-gradient(135deg, #a8ff40 0%, #38f9d7 100%)',
    link: '#',
  },
]

export default function Work() {
  return (
    <section className="work section" id="work">
      <div className="container">
        <p className="section-label reveal">Selected Work</p>
        <div className="work-grid">
          {projects.map((p, i) => (
            <article key={p.id} className={`project-card reveal d${i + 1}`}>
              <div className="project-card-cover" style={{ background: p.gradient }}>
                <span className="project-card-id">{p.id}</span>
                <span className="project-card-year">{p.year}</span>
              </div>
              <div className="project-card-body">
                <h3 className="project-card-title">{p.title}</h3>
                <p className="project-card-desc">{p.description}</p>
                <div className="project-card-footer">
                  <div className="project-card-tags">
                    {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <a href={p.link} className="project-card-link">
                    View <span>→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
