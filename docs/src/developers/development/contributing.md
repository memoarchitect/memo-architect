# Contributing

## Development Setup

```bash
git clone https://github.com/memoarchitect/memo-architect.git
cd memo-architect
pnpm install
pnpm run build
pnpm run test
```

## Development Workflow

### Working on `@memoarchitect/tools`

```bash
cd ../memo-tools  # sibling checkout in memo-meta
pnpm run build    # Rebuild after changes
pnpm run test
```

After changing the Langium grammar under `packages/tools/src/grammar`, the
build step runs `langium generate`.

### Working on `@memoarchitect/architect`

```bash
pnpm run example:dev
```

The web app hot-reloads via Vite. Changes to React components reflect immediately.

## Project Structure

| Directory | Purpose |
|---|---|
| `../memo/` | `@memoarchitect/ontology` sibling in the meta workspace |
| `../memo-tools/packages/tools/src/` | `@memoarchitect/tools` sibling source |
| `packages/web/src/views/` | Diagram canvas, layout engine |
| `packages/web/src/components/` | UI components |
| `packages/web/src/store/` | Zustand state + WebSocket client |

## Testing

All tests use **Vitest**:

```bash
# Run all tests
pnpm run test

# Run with coverage
pnpm run test:coverage

# Run Tools tests from the sibling repository
pnpm --dir ../memo-tools test
```

### Test Coverage

| Package | Tests | Status |
|---|---|---|
| `@memoarchitect/ontology` | Node test suite | Package shape and published content |
| `@memoarchitect/tools` | Vitest suite | Parser, validation, commands, and E2E workflows |
| `@memoarchitect/architect` | Vitest suite | Workbench behavior and renderer/view logic |

## Code Style

- **TypeScript** for all packages
- **ESM** (`"type": "module"`) throughout
- **Node.js >= 20** required
- File headers with `// ─── Section Name ───` comment style
- Interfaces over classes for data types
- Maps for indexed collections (MemoModel), Records for serialization (MemoModelDTO)

## Build Commands

```bash
pnpm run build         # Build Architect against installed npm dependencies
pnpm run test          # Run all tests
pnpm run type-check    # TypeScript checking only
pnpm run clean         # Remove all build artifacts
pnpm run lint          # Run linter
```
