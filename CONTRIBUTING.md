# Contributing to MEMO Architect

Thank you for helping improve the MEMO visual workbench.

## Setup

```bash
git clone --recurse-submodules https://github.com/memoarchitect/memo-architect.git
cd memo-architect
corepack enable
pnpm install
pnpm run build
pnpm run test
```

Use Node.js 20 or later and pnpm 9 or later. The repository's `.nvmrc` selects
the minimum supported Node.js major.

## Repository boundaries

- `memo` contains portable SysML v2 ontology and methodology content.
- `memo-tools` contains reusable non-UI libraries, project operations, and the CLI.
- `memo-architect` contains React presentation code and public technical docs.
- Core model behavior belongs in Memo Tools so the CLI and Architect use the same
  implementation.
- React-specific interaction and rendering belongs in `packages/web`.

Dependency direction is strictly:

```text
memo ← memo-tools ← memo-architect
```

Lower layers must not import from higher layers.

## Making changes

1. Read the relevant architecture or design documentation.
2. Keep changes within the repository boundary described above.
3. Add or update tests for changed behavior.
4. Run the complete verification suite:

```bash
pnpm run build
pnpm run test
pnpm run type-check
```

For ontology changes, also run the SysAnd portability build in the nested
`memo-tools/memo` repository.

## Public documentation

Public documentation should explain released behavior, architecture, extension
contracts, or contribution requirements. Do not commit private roadmaps, internal
handoffs, credentials, customer information, personal working files, or release
coordination notes to this repository.

## Reporting issues

Use the public [GitHub issue tracker](https://github.com/memoarchitect/memo-architect/issues)
for reproducible defects and public feature discussions. Never include proprietary
device models or regulated customer data in an issue.
