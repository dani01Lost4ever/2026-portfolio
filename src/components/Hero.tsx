import { useHero } from '../context/content-hooks'
import { ArrowDown } from './Icons'
import SectionLink from './SectionLink'
import { STOP_BG, stopAttrs } from './fieldStops'

export default function Hero() {
  const hero = useHero()

  const who = [hero.name, 'full-stack developer', hero.location ? `in ${hero.location}` : '']
    .filter(Boolean)
  const status = `${who[0]}, ${who.slice(1).join(' ')}.${hero.availableForWork ? ' Available for work.' : ''}`

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
          {hero.taglines.map((line, i) => <span key={i}>{line} </span>)}
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
