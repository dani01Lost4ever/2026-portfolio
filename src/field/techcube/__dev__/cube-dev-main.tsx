import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CubeDemo from './CubeDemo'
import './cube-demo.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CubeDemo />
  </StrictMode>,
)
