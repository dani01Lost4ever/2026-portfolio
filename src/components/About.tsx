/**
 * About — editorial restructure.
 *
 * Top: section eyebrow + massive Boldonse heading.
 * Middle: bio essay on the left, the TypographyLab on the right —
 *         the word "interface." set in Boldonse italic, every letter
 *         independently draggable with spring physics. A small
 *         typographic playground that ties back to the hero tagline.
 * Bottom: skills as a typographic list with mono category labels and
 *         Onest items, four groups in a flexible asymmetric grid.
 */

import { useAbout } from '../context/ContentContext'
import TypographyLab from './TypographyLab'

export default function About() {
  const about = useAbout()

  return (
    <section className="about section" id="about">
      <div className="container">
        <header className="about-head reveal">
          <span className="about-eyebrow">
            <span className="about-eyebrow-num">02</span>
            About
          </span>
          <span className="about-rule" aria-hidden />
          <span className="about-meta">Bio · stack · craft</span>
        </header>

        <h2 className="about-heading reveal d1">
          Full-stack,<br />
          <span className="about-heading-accent">end to end.</span>
        </h2>

        <div className="about-grid">
          <div className="about-bio reveal d2">
            {about.bio.map((paragraph, i) => (
              <p key={i} className="about-bio-p">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="about-lab reveal d3">
            <TypographyLab />
          </div>
        </div>

        <div className="about-skills reveal d3">
          <h3 className="about-skills-heading">
            <span className="about-skills-num">03</span>
            Stack
          </h3>

          <ul className="about-skills-list">
            {about.skills.map(group => (
              <li key={group.category} className="about-skill-group">
                <span className="about-skill-category">{group.category}</span>
                <span className="about-skill-items">
                  {group.items.map((item, idx) => (
                    <span key={item} className="about-skill-item">
                      {item}
                      {idx < group.items.length - 1 && (
                        <span className="about-skill-sep" aria-hidden> · </span>
                      )}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
