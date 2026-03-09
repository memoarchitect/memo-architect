// ─── MEMO Configuration Types ─────────────────────────────────────────────────
//
// Domain packages (e.g. @memo/medical) implement MEMOConfig as config.yaml.
// Projects inherit from domain configs via the `extends` field.
// The CLI merges the inheritance chain at startup.
//
// Two project types:
//   - "ontology" — shared type system (like EA MDG Technology)
//   - "device"   — specific medical device model referencing an ontology
// ─────────────────────────────────────────────────────────────────────────────

/** Project type discriminator */
export type ProjectType = 'ontology' | 'device';

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

/** SysML v2 constructs supported as entity base types */
export type SysMLConstruct =
    | 'part def'
    | 'requirement def'
    | 'action def'
    | 'port def'
    | 'interface def'
    | 'connection def'
    | 'attribute def'
    | 'enum def';

/** Definition of an entity kind within a domain */
export interface KindDefinition {
    /** Human-readable label */
    label: string;
    /** CoSMA layer this kind belongs to */
    layer?: string;
    /** SysML v2 construct this kind maps to */
    sysmlConstruct: SysMLConstruct;
    /** Icon identifier for the palette/diagram */
    icon?: string;
    /** Template file for new instances (relative to domain package) */
    template?: string;
    /** Default attributes for new instances */
    defaultAttributes?: Record<string, string>;
}

/** A closure rule evaluated by the validation engine */
export interface ClosureRule {
    /** Unique rule identifier, e.g. "CR-MED-001" */
    id: string;
    /** Human-readable description */
    description: string;
    /** Entity kind this rule applies to */
    entity: string;
    /** Rule definition */
    rule: ClosureRuleDefinition;
    /** Error severity when rule is violated */
    severity: 'error' | 'warning' | 'info';
    /** CoSMA layer this rule contributes completeness to */
    completenessLayer?: string;
}

export type ClosureRuleDefinition =
    | { type: 'requireRelationship'; relationship: string; min: number; max?: number }
    | {
          type: 'conditionalRequireRelationship';
          condition: RuleCondition;
          relationship: string;
          min: number;
      }
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

/** Guided workflow step for wizard-like interactions */
export interface WorkflowStep {
    /** Step identifier */
    id: string;
    /** Human-readable label */
    label: string;
    /** Entity kinds involved in this step */
    kinds: string[];
    /** Prompt text for the user */
    prompt: string;
}

/** Guided workflow definition */
export interface WorkflowDefinition {
    /** Unique workflow identifier */
    id: string;
    /** Human-readable label */
    label: string;
    /** Ordered steps */
    steps: WorkflowStep[];
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

/** Ontology reference in a device project */
export interface OntologyReference {
    /** Package name, e.g. "@memo/ontology" or "memo-ontology" on SysAnd */
    name: string;
    /** Semver version constraint, e.g. "^2.0.0" */
    version: string;
}

/**
 * MEMOConfig — the complete project/domain configuration.
 *
 * Two project types:
 *   - "ontology": defines a shareable type system (publishable as .kpar)
 *   - "device": models a specific medical device (references an ontology)
 */
export interface MEMOConfig {
    /** Project name (set by `memo init`) */
    projectName: string;

    /** Project type: "ontology" or "device" */
    projectType: ProjectType;

    /** Parent config to inherit from, e.g. '@memo/medical' */
    extends?: string;

    /** Ontology references (device projects only) */
    ontologies?: OntologyReference[];

    /** CoSMA visualization layers */
    cosmaLayers?: CosmaLayer[];

    /** Entity kind definitions (keyed by kind identifier) */
    kinds: Record<string, KindDefinition>;

    /** Typed relationship definitions with CoSMA layer mapping */
    relationshipTypes: RelationshipType[];

    /** Closure rules for model validation */
    closureRules: ClosureRule[];

    /** Viewpoint definitions for filtered views */
    viewpoints?: ViewpointDefinition[];

    /** Guided workflows for step-by-step modeling */
    workflows?: WorkflowDefinition[];

    /** First-run scaffolding configuration */
    firstRun?: FirstRunConfig;
}
