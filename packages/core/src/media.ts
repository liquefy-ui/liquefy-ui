/**
 * Not every DOM implementation ships `matchMedia` — jsdom is the one you hit
 * first, but any partial DOM counts. Reading a preference should never be the
 * thing that throws, so an unavailable query reads as "no preference stated".
 */
export const mediaQuery = (query: string): Pick<MediaQueryList, 'matches'> =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : { matches: false }
