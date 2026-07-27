# @liquefy-ui/icons

## 0.1.3

### Patch Changes

- 0781867: Broaden the npm keywords so search finds these packages by what they are

## 0.1.2

### Patch Changes

- Republish `@liquefy-ui/core` with the provenance attestation 0.1.1 is missing.

  The other packages picked up their trusted-publisher configuration on the 0.1.1
  release; core did not, so its OIDC exchange failed and the publish fell back to the
  token — which produces an unsigned tarball.

  `icons` and `react` ride along because the three are a linked group and
  `test/metadata.test.mjs` holds them to one version. None of the packaged code
  changed.

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
