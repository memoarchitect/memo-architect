# Architecture Overview

MEMO is a monorepo containing 5 packages that form a layered architecture from parsing to visualization.

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

    subgraph "@memo/ontology"
        Types[60+ SysML v2 Types]
        Rels[16 Relationship Types]
    end

    subgraph "@memo/medical"
        MedConfig[70 Entity Kinds]
        Rules[15 Closure Rules]
        Viewpoints[7 Viewpoints]
        Layers[10 CoSMA Layers]
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
    MedConfig --> Types

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
| `@memo/ontology` | Base type system | SysML v2 type definitions (`.sysml` files) |
| `@memo/medical` | Domain config | `memo.config.yaml` with 70 kinds, 15 rules, 7 viewpoints |
| `@memo/cli` | CLI commands | `memo dev`, `memo validate`, `memo init` |
| `@memo/web` | Browser UI | React app with diagram, sidebar, completeness |

## Dependency Graph

```
@memo/web ──> @memo/core
@memo/cli ──> @memo/core
@memo/medical ──> @memo/ontology
@memo/core (standalone)
@memo/ontology (standalone)
```

The `@memo/core` package has zero runtime dependencies on domain packages. Domain knowledge flows through `memo.config.yaml` at runtime.
