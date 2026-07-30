# @liquefy-ui/mcp

## 0.1.3

### Patch Changes

- ecc096c: Carry the `mcpName` the official MCP Registry verifies ownership with, and the
  `server.json` that describes the server to it. The registry stores metadata only
  and checks it against the published package, so the name has to ship inside
  `package.json` before the server can be registered at all — a release is the only
  way it gets there.

## 0.1.2

### Patch Changes

- 0781867: Broaden the npm keywords so search finds these packages by what they are

## 0.1.1

### Patch Changes

- Publish with npm provenance.

  0.1.0 shipped unsigned. `publishConfig.provenance` is read by npm, but this is a
  pnpm workspace, so `changeset publish` shells out to `pnpm publish` — which has no
  provenance support at all and silently ignored the field.

  The registry now trusts this repository's `release.yml` directly through OIDC, so
  no token is exchanged and npm attaches the attestation itself. Nothing about the
  packaged code changed; this release exists so the published artifact can be traced
  back to the commit that built it.
