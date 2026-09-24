import { useHero } from '../context/content-hooks'
import { ArrowDown } from './Icons'
import SectionLink from './SectionLink'
import { STOP_BG, capitalise, stopAttrs } from './fieldStops'
import { cmsText, taglineLines } from './content'

export default function Hero() {
  const hero = useHero()

  const name = cmsText(hero.name)
  const location = cmsText(hero.location)
  const role = `full-stack developer${location ? ` in ${location}` : ''}`
  const status = `${name ? `${name}, ${role}` : capitalise(role)}.${hero.availableForWork ? ' Available for work.' : ''}`
  const lines = taglineLines(hero.taglines)

  return (
    <section
      className="hero"
      id="top"
      aria-labelledby="hero-title"
      {...stopAttrs({ key: 'grid', shape: 'grid', side: 'center', bg: STOP_BG.grid })}
    >
      <div className="hero-inner">
        <p className="status">
          {hero.availableForWork && <span className="dot" aria-hidden="true" />}
          {status}
        </p>
        <h1 id="hero-title">
          {lines.map((line, i) => <span key={i}>{line} </span>)}
        </h1>
        <p className="hero-sub">{hero.subtitle}</p>
        <div className="cta">
          {hero.cta.map(c => {
            const primary = c.variant === 'primary'
            const cls = `btn ${primary ? 'btn-primary' : 'btn-ghost'}`
            const inner = <>{c.label}{primary && <ArrowDown />}</>
            return c.href.startsWith('#')
              ? <SectionLink key={c.label} to={c.href.slice(1)} className={cls}>{inner}</SectionLink>
              : <a key={c.label} href={c.href} className={cls}>{inner}</a>
          })}
        </div>
        {hero.stats.length > 0 && (
          <dl className="stats">
            {hero.stats.map(s => (
              <div key={s.label}><dt>{s.value}</dt><dd>{s.label}</dd></div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}
