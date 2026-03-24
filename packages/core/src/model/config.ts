// ─── MEMO Configuration Types ─────────────────────────────────────────────────
//
// Domain packages (e.g. @memo/medical-modeling-profile) implement MEMOConfig as config.yaml.
// Projects inherit from domain configs via the `extends` field.
// The CLI merges the inheritance chain at startup.
//
// Four project types:
//   - "ontology" — shared type system (kinds + relationships)
//   - "profile"  — closure rules, viewpoints, templates (extends an ontology)
//   - "library"  — reusable model elements (instances, not types)
//   - "device"   — specific medical device model referencing an ontology
// ─────────────────────────────────────────────────────────────────────────────

/** Project type discriminator */
export type ProjectType = 'ontology' | 'profile' | 'library' | 'device';

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
    | 'action usage'
    | 'item def'
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

export type RelationshipRuleDirection = 'any' | 'incoming' | 'outgoing';

export type ClosureRuleDefinition =
    | {
          type: 'requireRelationship';
          relationship: string;
          min: number;
          max?: number;
          direction?: RelationshipRuleDirection;
          relatedKinds?: string[];
      }
    | {
          type: 'conditionalRequireRelationship';
          condition: RuleCondition;
          relationship: string;
          min: number;
          direction?: RelationshipRuleDirection;
          relatedKinds?: string[];
      }
    | { type: 'requireAttribute'; attribute: string }
    | { type: 'uniqueAttribute'; attribute: string }
    | {
          type: 'cardinalityCheck';
          relationship: string;
          min: number;
          max: number;
          direction?: RelationshipRuleDirection;
          relatedKinds?: string[];
      };

export interface RuleCondition {
    attribute: string;
    operator: 'eq' | 'neq' | 'in' | 'gte' | 'lte';
    values: string[];
}

/** SysML v2 diagram type classification */
export type DiagramType = 'bdd' | 'ibd' | 'req' | 'ucd' | 'act' | 'afd' | 'pkg' | 'par' | 'risk';

/** Diagram definition — a named, typed view within a viewpoint */
export interface DiagramDefinition {
    /** Unique diagram identifier, e.g. "diag-risk-chain" */
    id: string;
    /** Human-readable name, e.g. "Risk Mitigation Chain" */
    name: string;
    /** SysML v2 diagram type */
    diagramType: DiagramType;
    /** Parent viewpoint ID this diagram belongs to */
    viewpointId: string;
    /** Whether this diagram is auto-generated from the viewpoint */
    auto: boolean;
    /** Description / purpose of this diagram (used in doc generation) */
    description?: string;
    /** Additional metadata properties (free-form, for doc generation) */
    properties?: Record<string, string>;
    /** Optional override: specific element IDs to include (subset of viewpoint) */
    elementIds?: string[];
    /** Optional override: specific relationship types to show */
    relationshipTypes?: string[];
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
    /** SysML v2 diagram types supported by this viewpoint */
    supportedDiagramTypes?: DiagramType[];
    /** Auto-generated diagrams for this viewpoint */
    diagrams?: DiagramDefinition[];
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
    /** Package name, e.g. "@memo/ontology-medical" or "memo-ontology-medical" on SysAnd */
    name: string;
    /** Semver version constraint, e.g. "^2.0.0" */
    version: string;
}

/** Self-describing metadata for an ontology package */
export interface OntologyMetadata {
    /** Package identifier, e.g. "@memo/ontology-medical" */
    id: string;
    /** Semver version */
    version: string;
    /** Human-readable description */
    description: string;
    /** Author or organization */
    author?: string;
    /** License identifier, e.g. "Apache-2.0" */
    license?: string;
    /** Searchable tags, e.g. ["medical", "ISO-14971"] */
    tags?: string[];
}

/** Reference to an external ontology (OWL, JSON-LD, or SysAnd format) */
export interface ExternalOntologyRef {
    /** Import format */
    source: 'owl' | 'jsonld' | 'sysand';
    /** File path or URL to the ontology */
    uri: string;
    /** Namespace prefix, e.g. "fma" */
    prefix: string;
    /** Import only these classes/concepts (empty = import all) */
    subset?: string[];
}

/** Reference to a reusable element library */
export interface LibraryRef {
    /** Package name, e.g. "@sysand/std-library" */
    package: string;
    /** Import only these categories, e.g. ["USB", "Logging"] */
    categories?: string[];
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

    /** Project type: "ontology", "profile", "library", or "device" */
    projectType: ProjectType;

    /** Parent config to inherit from, e.g. '@memo/medical-modeling-profile' */
    extends?: string;

    /** Ontology references (device projects only) */
    ontologies?: OntologyReference[];

    /** Self-describing metadata for ontology packages */
    ontologyMetadata?: OntologyMetadata;

    /** External ontology imports (OWL, JSON-LD, SysAnd) */
    externalOntologies?: ExternalOntologyRef[];

    /** Reusable element library imports */
    libraries?: LibraryRef[];

    /** CoSMA visualization layers */
    cosmaLayers?: CosmaLayer[];

    /** Entity kind definitions (keyed by kind identifier). Optional — prefer KindRegistry. */
    kinds?: Record<string, KindDefinition>;

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
