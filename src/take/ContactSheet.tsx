/**
 * ContactSheet — the contact card's "Write to me": the same sheet as the projects, grown out
 * of the button on the card, holding the email and the short-note form.
 */

import { useEffect, useRef, type KeyboardEvent } from 'react'
import ContactForm from '../components/ContactForm'
import { sprMs } from './engine/math'
import { trapTab, useSheetMotion, type SheetFrame, type SheetFrom } from './useSheetMotion'

interface Props {
  email: string
  availability: string
  from: SheetFrom
  closeTo(): SheetFrom
  onClosed(): void
}

export default function ContactSheet({ email, availability, from, closeTo, onClosed }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const render = ({ now, openedAt }: SheetFrame) => {
    sheetRef.current?.querySelectorAll<HTMLElement>('.vl > div').forEach((b, j) => {
      b.style.transform = `translateY(${((1 - sprMs(now, openedAt + 230 + j * 50, 0.45, 0.88)) * 110).toFixed(2)}%)`
    })
  }
  const motion = useSheetMotion(sheetRef, scrimRef, from, render, onClosed)
  const close = () => motion.close(closeTo())

  // focus the close button on open, give it back to the opener on close
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }) }
  }, [])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else trapTab(e, sheetRef.current)
  }

  return (
    <div className="tk-sheets" onKeyDown={onKeyDown} data-take-prevent>
      <div className="vscrim" ref={scrimRef} onClick={close} aria-hidden="true" />
      <div className="sheet sheet-contact" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="cs-title">
        <div className="cs-body">
          <div className="vl"><div className="vk">Contact</div></div>
          <div className="vl"><div><h2 className="vt" id="cs-title">Write to me.</h2></div></div>
          {availability && <div className="vl"><div><p className="vs">{availability}</p></div></div>}
          <div className="vl"><div><p className="vd">Straight to <a className="link" href={`mailto:${email}`}>{email}</a>, or a short note here.</p></div></div>
          <div className="vl"><div><ContactForm /></div></div>
        </div>
        <button type="button" className="vclose" ref={closeRef} onClick={close} aria-label="Close">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
        </button>
      </div>
    </div>
  )
}
