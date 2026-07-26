import type { NextConfig } from 'next'

// The workspace packages ship pre-built ESM, so nothing needs transpiling here.
// Keeping the config bare is deliberate: if this app needs special handling to
// build, then so does every consumer, and that is the bug this app exists to catch.
//
// This app pins TypeScript 5 rather than the repo's TypeScript 7, both because
// Next's in-build checker still loads the legacy JS compiler API and because it
// type-checks the published `.d.ts` the way most consumers will.
const config: NextConfig = {}

export default config
