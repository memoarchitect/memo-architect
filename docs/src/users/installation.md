# Installation

## Prerequisites

- **Node.js** 24 LTS
- **pnpm** >= 9.15.0

## Clone and Install

```bash
git clone --recurse-submodules https://github.com/memoarchitect/memo-architect.git
cd memo-architect
pnpm install
```

## Build All Packages

```bash
pnpm run build
```

This uses Turborepo to build all workspace packages in dependency order, including:

1. `@memo/ontology-core` — Domain-agnostic MBSE backbone ontology
2. `@memo/ontology-medical` — Reusable medical device development backbone
3. `@memo/core` — Parser, model builder, validator, completeness tracker
4. `@memo/medical-modeling-profile` — Medical domain configuration
5. `@memo/cli` — Command-line interface
6. `@memo/web` — React web application

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
