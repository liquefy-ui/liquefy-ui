/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Checked in on purpose. `next build` writes an equivalent `next-env.d.ts`, but
// `pnpm typecheck` runs before the build in CI, so the ambient types have to
// exist without it.
