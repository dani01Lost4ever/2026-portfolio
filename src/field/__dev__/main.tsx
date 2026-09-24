/* Temporary harness entry (field-dev.html). Remove at integration. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'lenis/dist/lenis.css'
import './demo.css'
import { FieldProvider } from '../FieldProvider'
import { FieldCanvas } from '../FieldCanvas'
import { FieldDemo } from './FieldDemo'

const el = document.getElementById('root')
if (el) {
  const root = createRoot(el)
  // lets test scripts verify that unmounting cleans everything up
  ;(window as unknown as { __unmountField?: () => void }).__unmountField = () => root.unmount()
  root.render(
    <StrictMode>
      <FieldProvider>
        <FieldCanvas />
        <FieldDemo />
      </FieldProvider>
    </StrictMode>,
  )
}
