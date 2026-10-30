import { useEffect, useLayoutEffect } from 'react'

/**
 * A layout effect on the client, so the glass is drawn in the frame it mounts
 * in; a plain effect on the server, which has no layout and would only warn.
 */
export const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect
