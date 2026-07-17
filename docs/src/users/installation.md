# Installation

## Prerequisites

- Node.js 26 or later
- pnpm 9.15 or later
- Python 3.12 and PDM only when building the documentation site

## Development checkout

Clone Architect directly; versioned Tools and Ontology packages are installed
from npm:

```bash
git clone https://github.com/memoarchitect/memo-architect.git
cd memo-architect
corepack enable
pnpm install
pnpm run build
```

The build compiles Architect against the exact `@memoarchitect/tools` and
`@memoarchitect/ontology` versions in `package.json`. Maintainers use the
separate `memo-meta` sibling workspace when changing all three together.

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

The installed commands are independent of a source checkout. Install from npm:

```bash
npm install @memoarchitect/tools
npm install @memoarchitect/architect
```

`@memoarchitect/tools` installs `@memoarchitect/ontology`; `@memoarchitect/architect` installs both lower
layers. Then initialize a product model in its own directory:

```bash
mkdir my-device
cd my-device
memo init .
memo validate .
memo-architect dev
```

Product files remain in `my-device`; MEMO implementation code remains in the
installed packages. See [Command Line Usage](cli-usage.md) for the complete
command surface and [Running MEMO](running.md) for server options.
