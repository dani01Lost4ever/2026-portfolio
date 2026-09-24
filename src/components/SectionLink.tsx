import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useSectionJump } from './useSectionJump'

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Section id on the home page, without the '#'. */
  to: string
  children: ReactNode
}

/** A link to a home-page section that works from any route. */
export default function SectionLink({ to, onClick, children, ...rest }: Props) {
  const { jump, onHome } = useSectionJump()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    jump(to)
  }

  return (
    <a href={onHome ? `#${to}` : `/#${to}`} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
