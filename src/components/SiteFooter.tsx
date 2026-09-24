import { useContact } from '../context/content-hooks'
import SectionLink from './SectionLink'

export default function SiteFooter({ topId = 'top' }: { topId?: string }) {
  const contact = useContact()
  return (
    <footer className="site-footer">
      <span>{contact.copyright}</span>
      <SectionLink to={topId}>Back to top</SectionLink>
    </footer>
  )
}
