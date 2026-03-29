# Data Flow

This page traces how data flows from `.sysml` source files through the system to the browser diagram.

## End-to-End Pipeline

```mermaid
sequenceDiagram
    participant FS as File System
    participant Parser as Langium Parser
    participant Builder as Model Builder
    participant Validator as Rule Engine
    participant Complete as Completeness
    participant DTO as Serializer
    participant WS as WebSocket
    participant Store as Zustand Store
    participant UI as React UI

    FS->>Parser: .sysml files
    Parser->>Builder: AST documents
    Builder->>Builder: buildMemoModel(docs, config)
    Builder->>Validator: MemoModel
    Validator->>Validator: evaluateClosureRules(model, config)
    Builder->>Complete: MemoModel + ValidationResult
    Complete->>Complete: computeCompleteness()
    Builder->>DTO: modelToDTO(model, {viewpoints, cosmaLayers})
    DTO->>WS: MemoModelDTO (JSON)
    Validator->>WS: ValidationResult
    Complete->>WS: CompletenessReport
    WS->>Store: model:update
    WS->>Store: validation:update
    WS->>Store: completeness:update
    Store->>UI: React re-render
    UI->>UI: computeLayout(model, viewpointFilter)
```

## Key Data Types

### MemoElement

Represents a single model element (part, requirement, action, port):

```typescript
interface MemoElement {
    id: string;          // Unique identifier (usage name)
    name: string;        // Human-readable name
    kind: string;        // Config kind key, e.g. "Hazard"
    construct: string;   // SysML construct: "part", "requirement", etc.
    layer: string;       // CoSMA layer: "risk", "requirements", etc.
    file: string;        // Source file path
    attributes: Record<string, string>;
    doc?: string;        // Doc comment
}
```

### MemoRelationship

A typed edge between two elements:

```typescript
interface MemoRelationship {
    id: string;          // Auto-generated ID
    type: string;        // Relationship type: "mitigates", "traceTo", etc.
    sourceId: string;    // Source element ID
    sourceEnd: string;   // Source end name from connection def
    targetId: string;    // Target element ID
    targetEnd: string;   // Target end name from connection def
    file: string;        // Source file path
}
```

### MemoModel (in-memory)

The full semantic graph with derived indexes:

```typescript
interface MemoModel {
    elements: Map<string, MemoElement>;
    relationships: MemoRelationship[];
    errors: ParseError[];
    // Derived indexes:
    elementsByKind: Map<string, MemoElement[]>;
    elementsByLayer: Map<string, MemoElement[]>;
    relationshipsByType: Map<string, MemoRelationship[]>;
    outgoing: Map<string, MemoRelationship[]>;
    incoming: Map<string, MemoRelationship[]>;
}
```

### MemoModelDTO (wire format)

JSON-serializable version sent over WebSocket:

```typescript
interface MemoModelDTO {
    elements: Record<string, MemoElement>;
    relationships: MemoRelationship[];
    errors: ParseError[];
    viewpoints?: ViewpointDTO[];
    cosmaLayers?: CosmaLayerDTO[];
}
```

## Live Reload Flow

When a `.sysml` file changes on disk:

```mermaid
sequenceDiagram
    participant FS as File System
    participant Watcher as Chokidar
    participant Rebuild as rebuild()
    participant WS as WebSocket Server
    participant Browser as Browser

    FS->>Watcher: file change event
    Note over Watcher: Debounce 300ms
    Watcher->>Rebuild: onChange callback
    Rebuild->>Rebuild: parse + build + validate + completeness
    Rebuild->>WS: broadcast 3 messages
    WS->>Browser: model:update
    WS->>Browser: validation:update
    WS->>Browser: completeness:update
    Browser->>Browser: Re-render diagram
```

## Viewpoint Filtering

Viewpoint filtering happens **client-side** in the browser:

1. The server sends the full model + viewpoint definitions in the DTO
2. The user selects a viewpoint in `ViewpointSelector`
3. `DiagramCanvas` builds a filter function from the viewpoint's `visibleKinds` and `visibleLayers`
4. `computeLayout()` applies the filter to produce a subgraph
5. ELK.js lays out only the visible elements
6. Relationships are included only if both endpoints are visible

This keeps the server stateless — it always sends the complete model.
