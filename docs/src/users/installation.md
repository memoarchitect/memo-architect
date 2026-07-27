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

To run a bundled example from the checkout, use the `architect` script. A checkout does
not put `memo-architect` on your `PATH`, so calling it directly would run a globally
installed copy instead of the one you just built:

```bash
pnpm architect --example gpca
pnpm architect --example standard-sysml-diagrams
```

In a standalone clone the ontology resolves from `node_modules`, so the example opens in
a disposable copy and your edits are discarded on exit. In the `memo-meta` workspace the
ontology is a linked checkout, so the same command edits the example in place — pass
`--read-only` if you only want to look around.

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
