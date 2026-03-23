import { Link } from 'react-router-dom'
import { useProjects } from '../context/ContentContext'

export default function Work() {
  const projects = useProjects()

  return (
    <section className="work section" id="work">
      <div className="container">
        <p className="section-label reveal">Selected Work</p>

        <div className="work-grid">
          {projects.map(p => (
            <Link
              key={p.slug}
              to={`/project/${p.slug}`}
              className="project-card reveal"
            >
              <div className="project-card-cover" style={{ background: p.gradient }}>
                <span className="project-card-id">{p.id}</span>
                <span className="project-card-year">{p.year}</span>
                <div className="project-card-hover-overlay">
                  <span>View Case Study →</span>
                </div>
              </div>
              <div className="project-card-body">
                <h3 className="project-card-title">{p.title}</h3>
                <p className="project-card-desc">{p.description}</p>
                <div className="project-card-footer">
                  <div className="project-card-tags">
                    {p.tags.slice(0, 3).map(t => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                    {p.tags.length > 3 && (
                      <span className="tag">+{p.tags.length - 3}</span>
                    )}
                  </div>
                  <span className="project-card-link">
                    View <span>→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
