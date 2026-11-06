/**
 * mark.ts — the db. monogram as inline SVG: Archivo 800 expanded outlined (the letters take
 * currentColor, the period is the site's hot accent). Drawn by scripts/outline-mark.py from the
 * variable font; the same outlines are in public/favicon.svg, public/icon-512.svg and
 * public/avatar-512.svg. Used by the film's chrome and the page header on narrow screens.
 */

const D = 'M319.5 -12Q239.1 -12 176.7 17.7Q114.3 47.5 78.3 108.7Q42.4 169.9 42.4 263.5Q42.4 358.1 78.1 419.1Q113.8 480.1 175.3 509.8Q236.8 539.5 315.3 539.5Q350.3 539.5 386.1 531.9Q421.9 524.3 453.5 507.8Q485 491.4 507 465.4H515.1V724.5H699.8V0H550.3L535.5 82.5H527Q487.8 29.9 434 9Q380.2 -12 319.5 -12ZM372.9 125.7Q420.6 125.7 452.4 142.7Q484.3 159.6 500.2 190Q516.1 220.4 516.1 260.1V267Q516.1 297.4 507.1 322Q498 346.7 479.8 364.3Q461.6 381.9 434.7 391.8Q407.8 401.8 372 401.8Q325.3 401.8 293.7 385.2Q262.1 368.5 246.1 339.6Q230.1 310.8 230.1 272.1V255.5Q230.1 216.8 246.3 187.4Q262.5 158 294.1 141.9Q325.7 125.7 372.9 125.7Z'
const B = 'M445.4 -12Q384.7 -12 330.9 9Q277 29.9 237.9 82.5H229.3L214.6 0H65V724.5H249.8V465.4H257.8Q280.4 491.4 311.9 507.8Q343.5 524.3 379.3 531.9Q415.1 539.5 449.5 539.5Q528.1 539.5 589.6 509.8Q651 480.1 686.8 419.1Q722.5 358.1 722.5 263.5Q722.5 169.9 686.5 108.7Q650.6 47.5 588.2 17.7Q525.8 -12 445.4 -12ZM391.9 125.7Q439.1 125.7 471 141.9Q502.8 158 518.8 187.4Q534.7 216.8 534.7 255.5V272.1Q534.7 310.8 518.8 339.6Q502.8 368.5 471.4 385.2Q440 401.8 392.8 401.8Q357.1 401.8 330.2 391.8Q303.3 381.9 285.1 364.3Q266.9 346.7 257.8 322Q248.8 297.4 248.8 267V260.1Q248.8 220.4 264.7 190Q280.6 159.6 312.7 142.7Q344.7 125.7 391.9 125.7Z'
const DOT = 'M65.9 0V183.2H283.6V0Z'

/** The monogram, 1671×737 units, letters in currentColor. */
export const MARK_SVG =
  `<svg class="mark" viewBox="0 0 1671 737" aria-hidden="true" focusable="false">` +
  `<path transform="translate(-42.4 724.5) scale(1 -1)" d="${D}" fill="currentColor"/>` +
  `<path transform="translate(672.6 724.5) scale(1 -1)" d="${B}" fill="currentColor"/>` +
  `<path transform="translate(1387.6 724.5) scale(1 -1)" d="${DOT}" fill="#FF5A3C"/></svg>`
