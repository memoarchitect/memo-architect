# Memo Architect Repository Layout

Memo Architect is a standalone npm product. Ontology and Tools are exact npm
dependencies, not nested repositories.

```text
memo-architect/
├── package.json             @memoarchitect/architect manifest and scripts
├── pnpm-workspace.yaml      root package only
├── packages/web/            React workbench source
├── src/                     Architect CLI and composition source
├── scripts/                 build, packaging, and verification scripts
└── docs/                    public user, developer, architecture, and design docs
```

## Package boundaries

| Package | Purpose |
|---|---|
| `@memoarchitect/ontology` | Portable ontology, methodology, templates, and examples |
| `@memoarchitect/tools` | Engine, headless operations, and `memo` CLI |
| `@memoarchitect/architect` | Visual workbench, live composition, and static viewer build |

## Development modes

A standalone clone installs exact package versions from npm:

```bash
pnpm install
pnpm run build
pnpm run test
pnpm run type-check
```

For changes spanning products, use `memo-meta`. Its three sibling submodules
remain independent git repositories while meta-only pnpm overrides link their
working trees.
