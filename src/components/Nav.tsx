import { useSite } from '../context/content-hooks'
import SectionLink from './SectionLink'

export default function Nav() {
  const site = useSite()
  const logo = site.logo || 'DB'

  return (
    <header className="nav">
      <SectionLink to="top" className="logo" aria-label="Daniel Busetto, home">{logo}</SectionLink>
      <nav aria-label="Primary">
        <ul>
          <li><SectionLink to="work">Work</SectionLink></li>
          <li><SectionLink to="about">About</SectionLink></li>
          <li className="hide-s"><SectionLink to="experience">Experience</SectionLink></li>
          <li><SectionLink to="contact" className="btn btn-primary">Contact</SectionLink></li>
        </ul>
      </nav>
    </header>
  )
}
