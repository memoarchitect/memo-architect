<p align="center">
  <strong>meMO Architect</strong><br>
  <em>Visual workbench for the Medical Engineering Modelling Ontology</em>
</p>

<p align="center">
  An optional visual workbench over the same model the <code>memo</code> CLI reads.
  SysML source remains the single source of truth and stays usable without the UI.
</p>

<p align="center">
  <code>memo-architect 0.4.4</code> &middot; MIT &middot; SysML v2 &middot;
  ISO 14971 &middot; IEC 62304 &middot; ISO/IEC/IEEE 42010
</p>

---

> **Status: work in progress.** APIs, views, and model semantics may change
> before the first stable release.

## Adopt only what you need

| Layer | Capability | Repository |
|---|---|---|
| 01–02 | Portable ontology and methodology for any SysML v2 editor | [memo](https://github.com/memoarchitect/memo) |
| 03 | Reusable engine libraries and the `memo` CLI | [memo-tools](https://github.com/memoarchitect/memo-tools) |
| 04 | Complete visual workbench | **memo-architect** (this repository) |

All three products share a `MAJOR.MINOR` compatibility line. Any `0.4.x`
release is intended to work with the other `0.4.x` products; patch versions
may advance independently for fixes and additive changes.

Architect reuses the parser, semantic model, validation, document, and project
operations from Memo Tools. The React application provides presentation and user
interaction; it does not maintain a second engineering model.

## Capabilities

- Explore architecture layers, catalog elements, and typed relationships.
- Review requirements, risk, software, verification, and assurance traceability.
- Render BDD, IBD, action-flow, sequence, state, tree, DSM, and tabular views.
- Author and export Design History File documents from the versioned model.
- Run the same validation and export operations through the CLI or the workbench.

## Repository layout

```text
package.json                   @memo/architect — the sole package in this repo
packages/web/                  internal React workbench source
src/                           Architect CLI and composition commands
memo-tools/                    submodule → @memo/tools
  memo/                       nested submodule → @memo/ontology
docs/                          public user, developer, architecture, and design docs
```

## Development quick start

Requires Node.js 24 LTS and pnpm 9 or later.

```bash
git clone --recurse-submodules https://github.com/memoarchitect/memo-architect.git
cd memo-architect
corepack enable
pnpm install
pnpm run build
pnpm run test
```

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

## Documentation

- [Start here](docs/src/index.md)
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
