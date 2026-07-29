<p align="center">
  <strong>meMO Architect</strong><br>
  <em>Visual workbench for the Medical Engineering Modelling Ontology</em>
</p>

<p align="center">
  An optional visual workbench over the same model the <code>memo</code> CLI reads.
  SysML source remains the single source of truth and stays usable without the UI.
</p>

<p align="center">
  <code>memo-architect 0.6.5</code> &middot; MIT &middot; SysML v2 &middot;
  ISO 14971 &middot; IEC 62304 &middot; ISO/IEC/IEEE 42010
</p>

<p align="center">
  <a href="https://memoarchitect.com/memo-architect.html">Product website</a> &middot;
  <a href="https://memoarchitect.com/memo-architect/">Documentation</a> &middot;
  <a href="https://github.com/memoarchitect/memo-architect">GitHub repository</a> &middot;
  <a href="https://www.npmjs.com/package/@memoarchitect/architect">npm package</a>
</p>

---

> **Status: published preview.** `@memoarchitect/architect` is available on npm.
> APIs, views, and model semantics remain pre-stable and may change before 1.0.

## Adopt only what you need

| Layer | Capability | Repository |
|---|---|---|
| 01–02 | Portable ontology and methodology for any SysML v2 editor | [Docs](https://memoarchitect.com/memo/) · [Repository](https://github.com/memoarchitect/memo) |
| 03 | Reusable engine libraries and the `memo` CLI | [Docs](https://memoarchitect.com/memo-tools/) · [Repository](https://github.com/memoarchitect/memo-tools) |
| 04 | Complete visual workbench | [Docs](https://memoarchitect.com/memo-architect/) · [Repository](https://github.com/memoarchitect/memo-architect) |

All three products share a `MAJOR.MINOR` compatibility line. Any `0.6.x`
release is intended to work with the other `0.6.x` products; patch versions
may advance independently for fixes and additive changes.

`VERSION` is the sole release-version source for this repository. Run
`pnpm version:sync` after changing it; CI rejects unsynchronized generated
version fields and automatically creates the matching `v<version>` tag when
the change reaches `main`.

Architect reuses the parser, semantic model, validation, document, and project
operations from Memo Tools. The React application provides presentation and user
interaction; it does not maintain a second engineering model.

## Current repository relationship

- Architect pins exact npm releases of `@memoarchitect/tools` and
  `@memoarchitect/ontology`.
- This repository contains no Tools or Ontology git submodules.
- The private `memo-meta` workspace checks out all three product repositories as
  siblings and applies meta-only pnpm overrides for coordinated development.
- A standalone Architect clone builds and tests entirely from npm dependencies.

## Capabilities

- Explore architecture layers, catalog elements, and typed relationships.
- Review requirements, risk, software, verification, and assurance traceability.
- Render BDD, IBD, action-flow, sequence, state, tree, DSM, and tabular views.
- Author and export Design History File documents from the versioned model.
- Run the same validation and export operations through the CLI or the workbench.

## Try it on a bundled example

The examples ship inside the ontology package, `@memoarchitect/ontology`, so
they are already present once Architect is installed — there is nothing to
clone or download. One command opens one:

```bash
memo-architect --example gpca
```

```bash
memo-architect --example standard-sysml-diagrams
```

| Example | What it contains |
|---|---|
| `gpca` | GPCA infusion-pump reference model — the full worked device |
| `standard-sysml-diagrams` | One openable view per standard SysML v2 diagram type |

Where the example is opened from depends on where the ontology resolves:

- **A local checkout** (a sibling clone or workspace link) is served **in
  place**, so edits are real and can be committed. The path is printed on
  startup.
- **An installed package** under `node_modules` is copied to a disposable
  directory first and the copy is discarded on exit, so a dependency is never
  modified.

Pass `--read-only` to force the disposable copy even from a checkout, and
`--port` to choose a port.

Every view is addressable, so any page can be bookmarked or shared while the
app is running — `/dashboard`, `/ontology`, `/dhf`, `/statistics`,
`/catalog/<family>/<shortId>` for an element, `/diagrams/<type>/<id>` for a
diagram. Back and Forward work as expected.

To point Architect at your own project instead, run `memo-architect dev` from
the project directory.

## Repository layout

```text
package.json                   @memoarchitect/architect — the sole package in this repo
packages/web/                  internal React workbench source
src/                           Architect CLI and composition commands
docs/                          public user, developer, architecture, and design docs
```

## Development quick start

Requires Node.js 26 or later (see `engines` in `package.json`) and pnpm 9 or later.

```bash
git clone https://github.com/memoarchitect/memo-architect.git
cd memo-architect
corepack enable
pnpm install
pnpm run build
pnpm run test
```

For coordinated changes across Ontology, Tools, and Architect, use the private
`memo-meta` workspace. It checks out all three repositories as sibling
submodules and links their matching npm package versions locally.

Run the bundled GPCA reference model:

```bash
pnpm run example:dev
# http://localhost:3000
```

Run headless Tools commands:

```bash
pnpm memo -- validate
pnpm memo -- export json
```

Run Architect commands:

```bash
pnpm architect -- dev
pnpm architect -- build --output dist
```

To open a bundled example, see [Try it on a bundled example](#try-it-on-a-bundled-example).

## Documentation

- [Published documentation](https://memoarchitect.com/memo-architect/)
- [Product website](https://memoarchitect.com/memo-architect.html)
- [Start here in the documentation source](docs/src/index.md)
- [Layers and their questions](docs/src/users/layers.md)
- [Choosing elements](docs/src/users/elements.md)
- [Connecting elements](docs/src/users/relationships.md)
- [Worked GPCA example](docs/src/users/gpca-example.md)
- [Documentation source index](docs/README.md)
- [Platform architecture](docs/architecture/platform.md)
- [SysML v2 authoring rules](docs/design/sysmlv2-rulebook.md)
- [Architecture decisions](docs/decisions/index.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT © 2026 memoarchitect
