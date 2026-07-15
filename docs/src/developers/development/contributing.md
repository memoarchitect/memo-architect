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

### Working on `@memo/core`

```bash
cd packages/core
pnpm run build    # Rebuild after changes
pnpm run test
```

After changing the Langium grammar (`src/grammar/memo-sysml.langium`), the build step runs `langium generate` to regenerate the parser.

### Working on `@memo/web`

```bash
cd examples/infusion-pump
pnpm memo dev     # Starts Vite + WebSocket server
```

The web app hot-reloads via Vite. Changes to React components reflect immediately.

### Working on `@memo/cli`

```bash
cd packages/cli
pnpm run build    # Rebuild TypeScript
cd ../../examples/infusion-pump
pnpm memo validate    # Test the validate command
pnpm memo dev         # Test the dev server
cd ../irrigation-pump
pnpm memo validate    # Compare against the second medical reference model
```

## Project Structure

| Directory | Purpose |
|---|---|
| `packages/core/src/grammar/` | Langium grammar for SysML v2 |
| `packages/core/src/model/` | Config, semantic model, builder |
| `packages/core/src/validator/` | Closure rule engine |
| `packages/core/src/completeness/` | Completeness tracker |
| `packages/core/src/__tests__/` | All core tests |
| `packages/cli/src/commands/` | CLI command implementations |
| `packages/cli/src/server/` | Dev server, file watcher, config resolver |
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
pnpm --filter @memo/core test
```

### Test Coverage

| Package | Tests | Status |
|---|---|---|
| `@memo/core` | Vitest suite | Parser, ontology parsing, real files, builder, validation |
| `@memo/cli` | Vitest suite | E2E CLI workflows against live example projects |
| `@memo/web` | 0 | Pending |

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
