/** Small stroke icons from the design, sized by CSS (1em). Always decorative. */

const common = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  'aria-hidden': true,
  focusable: false,
} as const

export function ArrowUpRight() {
  return <svg {...common}><path d="M5 11 11 5M6 5h5v5" /></svg>
}

export function ArrowDown() {
  return <svg {...common}><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" /></svg>
}

export function ArrowRight() {
  return <svg {...common}><path d="M3 8h10M8.5 3.5 13 8l-4.5 4.5" /></svg>
}

export function ArrowLeft() {
  return <svg {...common}><path d="M13 8H3M7.5 3.5 3 8l4.5 4.5" /></svg>
}
