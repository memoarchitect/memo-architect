# Installation

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.15.0

## Clone and Install

```bash
git clone https://github.com/someshkashyap/memo.git
cd memo
pnpm install
```

## Build All Packages

```bash
pnpm run build
```

This uses Turborepo to build all 5 packages in dependency order:

1. `@memo/ontology` — Base type definitions
2. `@memo/core` — Parser, model builder, validator, completeness tracker
3. `@memo/medical` — Medical domain configuration
4. `@memo/cli` — Command-line interface
5. `@memo/web` — React web application

## Verify Installation

```bash
# Run the test suite (120 tests)
pnpm run test

# Check the CLI is available
cd examples/infusion-pump
pnpm memo --help
```

You should see:

```
Usage: memo [options] [command]

MEMO — Model-Based Systems Engineering for Medical Devices

Options:
  -V, --version           output the version number
  -h, --help              display help for command

Commands:
  validate [dir]          Validate the model against closure rules
  dev [options]           Start development server with live model reload
  init [options] <name>   Scaffold a new MEMO project
  help [command]          display help for command
```

## Global Installation (Optional)

To use `memo` globally from any project:

```bash
cd packages/cli
pnpm link --global
```

Then from any MEMO project directory:

```bash
memo dev
memo validate
```
