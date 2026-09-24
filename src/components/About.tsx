import { useAbout } from '../context/content-hooks'
import { STOP_BG, capitalise, numberWord, stopAttrs } from './fieldStops'

export default function About() {
  const about = useAbout()
  const sizes = about.skills.map(g => g.items.length)

  return (
    <section id="about" aria-labelledby="about-title">
      <div className="about-intro">
        <div>
          <p className="kicker">{about.label}</p>
          <h2 id="about-title">{about.heading}</h2>
        </div>
        <div className="bio">
          {about.bio.map((para, i) => <p key={i}>{para}</p>)}
        </div>
      </div>

      <div
        className="stack"
        {...stopAttrs({ key: 'clusters', shape: 'clusters', side: 'center', bg: STOP_BG.clusters, clusterSizes: sizes })}
      >
        <p className="caption stack-cap">
          {capitalise(numberWord(sizes.length))} clusters, sized by how many tools live in each.
        </p>
        {about.skills.map((g, i) => (
          <div className="group" key={g.category} data-count={g.items.length} data-field-cluster={i}>
            <div className="spot" aria-hidden="true" />
            <div>
              <h3>{g.category}</h3>
              <p className="count">{g.items.length} {g.items.length === 1 ? 'skill' : 'skills'}</p>
              <ul>{g.items.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
