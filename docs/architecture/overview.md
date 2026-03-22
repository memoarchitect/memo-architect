# Architecture Overview

MEMO is a monorepo containing multiple packages that form a layered architecture from ontology definition through parsing, validation, and visualization.

## System Context

```mermaid
graph LR
    Dev[Developer] -->|writes| SysML[.sysml files]
    Dev -->|configures| Config[memo.config.yaml]
    Dev -->|runs| CLI[memo CLI]
    CLI -->|parses| SysML
    CLI -->|loads| Config
    CLI -->|serves| Web[Web App]
    Web -->|displays| Diagram[Interactive Diagram]
    Dev -->|views| Diagram
```

## Package Architecture

```mermaid
graph TD
    subgraph "@memo/core"
        Parser[Langium Parser]
        Builder[Model Builder]
        Validator[Rule Engine]
        Completeness[Completeness Tracker]
        Semantic[Semantic Model]
        Protocol[WebSocket Protocol]
    end

    subgraph "@memo/ontology-core"
        CoreTypes[Core MBSE Types]
        CoreRels[Core Relationships]
    end

    subgraph "@memo/ontology-medical"
        MedTypes[Medical Backbone Types]
        MedRels[Medical Relationships]
    end

    subgraph "@memo/medical"
        MedConfig[Medical Workbench Config]
        Rules[109 Closure Rules]
        Viewpoints[Medical Viewpoints]
        Templates[Starter Templates]
    end

    subgraph "@memo/cli"
        DevCmd[memo dev]
        ValidateCmd[memo validate]
        InitCmd[memo init]
        FileWatcher[File Watcher]
        DevServer[Dev Server]
        ConfigResolver[Config Resolver]
    end

    subgraph "@memo/web"
        React[React 18 App]
        ReactFlow[ReactFlow Diagram]
        ELK[ELK.js Layout]
        Zustand[Zustand Store]
        WS[WebSocket Client]
    end

    Parser --> Builder
    Builder --> Semantic
    Semantic --> Validator
    Semantic --> Completeness
    Semantic --> Protocol

    DevCmd --> Parser
    DevCmd --> ConfigResolver
    DevCmd --> DevServer
    DevCmd --> FileWatcher
    ConfigResolver --> MedConfig
    MedConfig --> MedTypes
    MedTypes --> CoreTypes

    Protocol --> WS
    WS --> Zustand
    Zustand --> React
    React --> ReactFlow
    ReactFlow --> ELK
```

## Package Responsibilities

| Package | Role | Key Exports |
|---|---|---|
| `@memo/core` | Parser, model, validation | `parseFiles`, `buildMemoModel`, `modelToDTO`, `evaluateClosureRules`, `computeCompleteness` |
| `@memo/ontology-core` | Core ontology backbone | Domain-agnostic SysML v2 MBSE types |
| `@memo/ontology-medical` | Medical ontology backbone | Medical device development types built on core |
| `@memo/medical` | Medical workbench config | `memo.config.yaml` with rules, viewpoints, and starter templates |
| `@memo/cli` | CLI commands | `memo dev`, `memo validate`, `memo init` |
| `@memo/web` | Browser UI | React app with diagram, sidebar, completeness |

## Dependency Graph

```
@memo/web ──> @memo/core
@memo/cli ──> @memo/core
@memo/medical ──> @memo/ontology-medical
@memo/cli ──> @memo/ontology-medical
@memo/ontology-medical ──> @memo/ontology-core
@memo/core (standalone)
@memo/ontology-core (standalone)
@memo/ontology-medical (standalone)
```

The `@memo/core` package has zero runtime dependencies on domain packages. Domain knowledge flows through `memo.config.yaml` at runtime.
