# Installation

## Prerequisites

- Node.js 20 or later
- pnpm 9.15 or later
- Python 3.12 and PDM only when building the documentation site

## Development checkout

Clone recursively because Memo Architect contains Memo Tools, which contains the
canonical MEMO ontology:

```bash
git clone --recurse-submodules https://github.com/memoarchitect/memo-architect.git
cd memo-architect
corepack enable
pnpm install
pnpm run build
```

The build runs the repositories in dependency order:

1. `@memo/ontology` and methodology/profile data from `memo-tools/memo`
2. `@memo/core` and `@memo/cli` from `memo-tools`
3. `@memo/web` from Memo Architect

The repositories share a `MAJOR.MINOR` compatibility line. Any `0.4.x` releases
are intended to work together; patch versions can advance independently.

## Verify the checkout

```bash
pnpm run test
pnpm run type-check
pnpm memo --version
pnpm memo --help
```

To run the included GPCA reference model:

```bash
pnpm run example:dev
```

## Work in any folder

The installed `memo` command is independent of the source checkout. After
installing the packaged Memo CLI and web application, initialize a product model
in its own directory:

```bash
mkdir my-device
cd my-device
memo init .
memo validate .
memo dev
```

Product files remain in `my-device`; MEMO implementation code remains in the
installed packages. See [Command Line Usage](cli-usage.md) for the complete
command surface and [Running MEMO](running.md) for server options.
