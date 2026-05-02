# Codebase Overview

This document provides a high-level technical summary of the **MEMO Architect** codebase for developers and contributors.

## Monorepo Structure

The project is structured as a **Turborepo** monorepo using **pnpm** workspaces. This allows for shared logic between the CLI, Core, and Web applications while maintaining clear boundaries.

### Packages

- **`@memo/core`:**
  - **The Engine:** Shared logic for SysML v2 parsing, model AST management (MemoModel), and the semantic validation framework.
  - **Registries:** Implements the `KindRegistry` and `RelationshipRegistry` discovery mechanisms.
  - **Parsing:** Uses **Langium** and a custom SysML v2 grammar subset for robust model indexing.
- **`@memo/cli`:**
  - **Server & Persistence:** Manages the WebSocket-to-disk persistence layer. It watches `.sysml` files for changes and broadcasts updates to the UI.
  - **Tools:** Provides `memo dhf`, `memo plugin`, and AI-powered commands (`ask`, `generate`).
- **`@memo/web`:**
  - **Workbench UI:** A high-performance React application featuring a custom diagramming engine (ELK.js + React Flow).
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
3.  **Running:** Navigate to an example (e.g., `examples/gpca-pump`) and run `memo dev` (via the linked CLI).
4.  **Testing:** `pnpm test` to run all unit and E2E tests across the monorepo.

For detailed contribution guidelines, see [Contributing](development/contributing.md).
