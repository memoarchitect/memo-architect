# Codebase Overview

This document provides a high-level technical summary of the **MEMO Architect** codebase for developers and contributors.

## Monorepo Structure

The development checkout uses three nested repositories and three pnpm
workspaces. Each repository root publishes one package.

### Packages

- **`@memo/ontology`:**
  - Portable SysML ontology, methodology, templates, and examples.
- **`@memo/tools`:**
  - **Engine and CLI:** Shared logic for SysML v2 parsing, model AST management (MemoModel), semantic validation, headless commands, and reusable server operations.
  - **Registries:** Implements the `KindRegistry` and `RelationshipRegistry` discovery mechanisms.
  - **Parsing:** Uses **Langium** and a custom SysML v2 grammar subset for robust model indexing.
- **`@memo/architect`:**
  - **Workbench UI and composition CLI:** A React application plus
    `memo-architect dev` and `memo-architect build`.
  - **State Management:** Uses **Zustand** for real-time model state synchronization with the CLI server.
- **`ontology/`:**
  - **Canonical ontology source:** SysML packages for architecture, compliance, artifacts, viewpoints, methodology, and base helpers.

Repository-level architecture and decisions live under `docs/architecture/` and `docs/decisions/`.

## Key Technologies

- **Language:** TypeScript across the entire stack.
- **Frameworks:**
  - **React:** For the web interface.
  - **Vitest:** For unit and E2E testing.
  - **Zustand:** For state management in the web app.
  - **Langium:** Background parsing and SysML v2 grammar support.
- **Styling:** Vanilla CSS (post-processed) for maximum control and performance.
- **Communications:** WebSocket-based protocol for model synchronization between UI and CLI.

## Local Development Workflow

1.  **Installation:** `pnpm install` at the root.
2.  **Building:** `pnpm build` to compile all packages.
3.  **Running:** Navigate to a project and run `memo-architect dev`.
4.  **Testing:** `pnpm test` to run all unit and E2E tests across the monorepo.

For detailed contribution guidelines, see [Contributing](development/contributing.md).
