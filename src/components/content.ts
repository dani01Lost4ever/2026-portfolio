/** Small guards for CMS text that may still hold placeholders. */

/** Empty string for missing values and bracketed placeholders like "[City]". */
export function cmsText(value: string | null | undefined): string {
  const v = (value ?? '').trim()
  return /^\[.*\]$/.test(v) ? '' : v
}

/**
 * Tagline lines for the hero heading: placeholders dropped, and a dangling
 * dash at the end of a line ("to interface —") turned into a comma, so the
 * lines read as one sentence.
 */
export function taglineLines(lines: readonly string[]): string[] {
  return lines
    .map(cmsText)
    .filter(Boolean)
    .map((line, i, all) => (i < all.length - 1 ? line.replace(/\s*[—–-]\s*$/, ',') : line))
}
