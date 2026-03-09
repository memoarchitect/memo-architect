# ADR-1-5: Domain Config Extension Point TypeScript Interface

**Status:** Accepted
**Date:** 2026-03-02
**Context:** Session 1 — Ontology

## Decision

Domain configurations (medical, automotive, generic) extend the core ontology via a **TypeScript interface** (`MEMOConfig`) that domain packages implement. The config is serialized as YAML (`.memo/config.yaml`) and resolved at runtime by the MEMO CLI.

### Extension Mechanism

1. **Core ontology** (`@memo/ontology`) defines base entity types and relationships.
2. **Domain package** (`@memo/medical`) provides a `config.yaml` that:
   - Adds domain-specific entity kinds (e.g., MedicalHazard, DHF_Document)
   - Adds domain-specific closure rules (e.g., ISO 14971 completeness checks)
   - Adds CoSMA layer mappings for visualization
   - Provides starter templates
3. **Project** inherits via `extends: '@memo/medical'` in `.memo/config.yaml`.
4. **Project can override** — add project-specific kinds, relax/tighten rules.

### Why This Design

- Core ontology NEVER modified by domains — open/closed principle.
- Domain configs are npm packages — versioned, publishable, composable.
- `extends` chain: project → domain → core. Each layer adds, never removes.
- TypeScript interface ensures all domain configs are structurally valid at build time.

## TypeScript Interface

```typescript
// File: memo-tool/packages/cli/src/types/config.ts

/** A CoSMA visualization layer grouping related entity kinds */
export interface CosmaLayer {
  /** Unique layer identifier, e.g. "requirements", "architecture" */
  id: string;
  /** Human-readable label for the layer */
  label: string;
  /** Hex color for layer visualization, e.g. "#4A90D9" */
  color: string;
}

/** A typed relationship between entity kinds */
export interface RelationshipType {
  /** Relationship identifier, e.g. "mitigates" */
  name: string;
  /** Human-readable label, e.g. "Mitigates" */
  label: string;
  /** CoSMA layer this relationship belongs to */
  layer: string;
  /** Hex color for relationship visualization */
  color: string;
}

/** Definition of an entity kind within a domain */
export interface KindDefinition {
  /** Human-readable label */
  label: string;
  /** CoSMA layer this kind belongs to */
  layer?: string;
  /** SysML v2 construct this kind maps to */
  sysmlConstruct: 'part def' | 'requirement def' | 'action def' | 'port def';
  /** Template file for new instances (relative to domain package) */
  template?: string;
  /** Default attributes for new instances */
  defaultAttributes?: Record<string, string>;
}

/** A closure rule evaluated by the CLI */
export interface ClosureRule {
  /** Unique rule identifier, e.g. "CR-001" */
  id: string;
  /** Human-readable description */
  description: string;
  /** Entity kind this rule applies to */
  entity: string;
  /** Rule definition */
  rule: ClosureRuleDefinition;
  /** Error severity when rule is violated */
  severity: 'error' | 'warning' | 'info';
}

export type ClosureRuleDefinition =
  | { type: 'requireRelationship'; relationship: string; min: number; max?: number }
  | { type: 'conditionalRequireRelationship'; condition: RuleCondition; relationship: string; min: number }
  | { type: 'requireAttribute'; attribute: string }
  | { type: 'uniqueAttribute'; attribute: string }
  | { type: 'cardinalityCheck'; relationship: string; min: number; max: number };

export interface RuleCondition {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'gte' | 'lte';
  values: string[];
}

/** Viewpoint definition for filtered model views */
export interface ViewpointDefinition {
  /** Unique viewpoint identifier */
  id: string;
  /** Human-readable name */
  label: string;
  /** Entity kinds visible in this viewpoint */
  visibleKinds: string[];
  /** Relationship types visible in this viewpoint */
  visibleRelationships: string[];
  /** CoSMA layers visible in this viewpoint */
  visibleLayers: string[];
}

/** First-run configuration for new projects */
export interface FirstRunConfig {
  /** Template to scaffold, e.g. "infusion-pump" */
  template?: string;
  /** Prompt user for project metadata */
  promptForMetadata?: boolean;
  /** Auto-create starter files */
  scaffoldFiles?: string[];
}

/**
 * MEMOConfig — the complete project/domain configuration.
 *
 * Domain packages implement this interface and serialize it as config.yaml.
 * Projects inherit from domain configs via the `extends` field.
 * The MEMO CLI merges the inheritance chain at startup.
 */
export interface MEMOConfig {
  /** Project name (set by `memo init`) */
  projectName: string;

  /** Parent config to inherit from, e.g. '@memo/medical' */
  extends?: string;

  /** CoSMA visualization layers */
  cosmaLayers?: CosmaLayer[];

  /** Entity kind definitions (keyed by kind identifier) */
  kinds: Record<string, KindDefinition>;

  /** Typed relationship definitions with CoSMA layer mapping */
  relationshipTypes: RelationshipType[];

  /** Backward-compatible flat list of relationship names */
  relationships: string[];

  /** Closure rules for model validation */
  closureRules: ClosureRule[];

  /** Viewpoint definitions for filtered views */
  viewpoints?: ViewpointDefinition[];

  /** First-run scaffolding configuration */
  firstRun?: FirstRunConfig;
}
```

## Config Inheritance Example

### Domain Config (`@memo/medical/src/config.yaml`)

```yaml
# This file IS the domain — it adds medical entity kinds,
# CoSMA layers, and ISO 14971 closure rules.
extends: '@memo/ontology'

cosmaLayers:
  - { id: requirements, label: Requirements, color: '#4A90D9' }
  - { id: architecture, label: Architecture, color: '#7B68EE' }
  - { id: risk,         label: Risk Management, color: '#E74C3C' }
  - { id: verification, label: Verification, color: '#2ECC71' }
  - { id: implementation, label: Implementation, color: '#F39C12' }

kinds:
  SoftwareItem:
    label: Software Item
    layer: architecture
    sysmlConstruct: part def
  MedicalHazard:
    label: Medical Hazard
    layer: risk
    sysmlConstruct: part def
  RiskControl:
    label: Risk Control
    layer: risk
    sysmlConstruct: part def
  Requirement:
    label: Requirement
    layer: requirements
    sysmlConstruct: requirement def
  # ... more kinds

closureRules:
  - id: CR-MED-001
    description: Every Hazard must have a mitigates relationship (ISO 14971)
    entity: MedicalHazard
    rule: { type: requireRelationship, relationship: mitigates, min: 1 }
    severity: error
```

### Project Config (`.memo/config.yaml` after `memo init medical my-pump`)

```yaml
projectName: my-pump
extends: '@memo/medical'

# Project can add additional kinds or override rules
# All medical kinds, layers, relationships, and rules are inherited
```

## Consequences

- Domain packages are drop-in npm installs — no code generation.
- The TypeScript interface is the contract — validated at compile time.
- Config YAML is human-editable and diffs cleanly in version control.
- `extends` chain is resolved by the CLI — deep merging with last-writer-wins on conflicts.
- Adding a new domain = creating a new npm package with `config.yaml` implementing `MEMOConfig`.
