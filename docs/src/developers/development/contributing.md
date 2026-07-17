# Contributing

Thank you for helping improve the MEMO visual workbench. Architect contains
React presentation code and the thin `memo-architect` composition CLI —
model behavior belongs in
[memo-tools](https://github.com/memoarchitect/memo-tools), and ontology
content belongs in [memo](https://github.com/memoarchitect/memo).

## Set up

```bash
git clone https://github.com/memoarchitect/memo-architect.git
cd memo-architect
corepack enable
pnpm install
pnpm run build
pnpm run test
```

Use Node.js 26 or later and pnpm 9 or later. The repository's `.nvmrc`
selects the minimum supported Node.js major.

## Where a change belongs

Dependency direction is strictly `memo ← memo-tools ← memo-architect`;
lower layers must not import from higher layers.

| You want to change… | Work in… |
|---|---|
| Diagram rendering, layout, or interaction | `packages/web/src/views/` |
| UI components, panels, or navigation | `packages/web/src/components/` |
| Client state or WebSocket handling | `packages/web/src/store/` |
| Validation, operations, protocol, or anything the CLI also needs | `../memo-tools` (sibling checkout in `memo-meta`) |
| Element meanings, relationships, or rules | `../memo` |

Two boundaries are enforced:

- **The web app imports only `@memoarchitect/tools/browser` and
  `@memoarchitect/tools/types`** — never the root export, which would pull
  Langium and `node:*` code into the Vite bundle.
- **No model semantics in React code.** If the workbench needs new model
  behavior, add it to Tools' operations or browser exports so the CLI and
  workbench share one implementation.

## Development workflow

```bash
pnpm run example:dev     # workbench on the GPCA example, hot-reloading
```

When changing `@memoarchitect/tools` alongside Architect:

```bash
cd ../memo-tools
pnpm run build           # rebuild after changes; grammar edits rerun langium generate
pnpm run test
```

## Testing

All tests use **Vitest**:

```bash
pnpm run test                    # all Architect tests
pnpm run test:coverage           # with coverage
pnpm --dir ../memo-tools test    # Tools suite from the sibling repository
```

Add or update tests for changed behavior. Workbench behavior, renderer, and
view logic are covered here; parser, validation, and command behavior are
covered in Tools.

## Code style

- TypeScript and ESM (`"type": "module"`) throughout
- File headers with `// ─── Section Name ───` comment style
- Interfaces over classes for data types
- Maps for indexed collections (`MemoModel`), Records for serialization
  (`MemoModelDTO`)

## Releases

`@memoarchitect/architect` and `@memoarchitect/tools` version and release in
lockstep, with Tools pinned exactly. A change to the WebSocket protocol or
DTOs therefore lands as a coordinated pair of pull requests and ships in one
release.
