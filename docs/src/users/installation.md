# Installation

[Check the prerequisites](prerequisites.md) before installing Architect.

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

The repositories share a `MAJOR.MINOR` compatibility line. Any `0.6.x` releases
are intended to work together; patch versions can advance independently.

## Verify the checkout

```bash
pnpm run test
pnpm run type-check
pnpm memo --version
pnpm memo --help
```

To run a bundled example in a disposable copy:

```bash
memo-architect --example gpca
memo-architect --example standard-sysml-diagrams
```

## Work in any folder

The installed commands are independent of a source checkout. Install from npm:

```bash
npm install @memoarchitect/tools
npm install @memoarchitect/architect
```

`memo init` creates a project `package.json` and installs
`@memoarchitect/ontology` in that project's `node_modules`. It also creates
`syside.toml`, which indexes the project source and the installed ontology
source. Then initialize a product model in its own directory:

```bash
mkdir my-device
cd my-device
memo init .
memo validate .
memo-architect dev
```

Open `http://localhost:3000` if the browser does not open automatically.
