# Contributing

## Development Setup

```bash
git clone --recurse-submodules https://github.com/memoarchitect/memo-architect.git
cd memo-architect
pnpm install
pnpm run build
pnpm run test
```

## Development Workflow

### Working on `@memo/tools`

```bash
cd memo-tools
pnpm run build    # Rebuild after changes
pnpm run test
```

After changing the Langium grammar under `packages/tools/src/grammar`, the
build step runs `langium generate`.

### Working on `@memo/architect`

```bash
pnpm run example:dev
```

The web app hot-reloads via Vite. Changes to React components reflect immediately.

## Project Structure

| Directory | Purpose |
|---|---|
| `memo-tools/memo/` | `@memo/ontology` source |
| `memo-tools/packages/tools/src/` | Internal `@memo/tools` engine and CLI source |
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

# Run specific package tests
pnpm --filter @memo/tools test
```

### Test Coverage

| Package | Tests | Status |
|---|---|---|
| `@memo/ontology` | Node test suite | Package shape and published content |
| `@memo/tools` | Vitest suite | Parser, validation, commands, and E2E workflows |
| `@memo/architect` | Vitest suite | Workbench behavior and renderer/view logic |

## Code Style

- **TypeScript** for all packages
- **ESM** (`"type": "module"`) throughout
- **Node.js >= 20** required
- File headers with `// ─── Section Name ───` comment style
- Interfaces over classes for data types
- Maps for indexed collections (MemoModel), Records for serialization (MemoModelDTO)

## Build Commands

```bash
pnpm run build         # Build all packages (Turborepo)
pnpm run test          # Run all tests
pnpm run type-check    # TypeScript checking only
pnpm run clean         # Remove all build artifacts
pnpm run lint          # Run linter
```
