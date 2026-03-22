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

This uses Turborepo to build all workspace packages in dependency order, including:

1. `@memo/ontology-core` — Domain-agnostic MBSE backbone ontology
2. `@memo/ontology-medical` — Reusable medical device development backbone
3. `@memo/ontology` — Frozen compatibility shim for legacy `MEMO_Ontology` imports
4. `@memo/core` — Parser, model builder, validator, completeness tracker
5. `@memo/medical` — Medical domain configuration
6. `@memo/cli` — Command-line interface
7. `@memo/web` — React web application

## Verify Installation

```bash
# Run the test suite
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

To verify the shared medical backbone against both reference models:

```bash
cd examples/infusion-pump
pnpm memo validate

cd ../irrigation-pump
pnpm memo validate
```
