import ProjectPanel from './ProjectPanel'
import { capitalise, numberWord } from './fieldStops'
import { useOrderedProjects } from './useOrderedProjects'

export default function Work() {
  const { projects, visuals, cubeProjects } = useOrderedProjects()

  return (
    <section id="work" aria-labelledby="work-title">
      <header className="work-intro">
        <p className="kicker">Selected work</p>
        <h2 id="work-title">Self-hosted platforms, AI agents and tools other developers install.</h2>
        <p>{capitalise(numberWord(projects.length))} projects, each built alone from schema to screen.</p>
      </header>
      {projects.map((p, i) => (
        <ProjectPanel key={p.slug} project={p} visuals={visuals[i]} index={i} cubeProjects={cubeProjects} />
      ))}
    </section>
  )
}
