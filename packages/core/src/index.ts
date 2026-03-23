// @memo/core — public API

// ─── Language (generated parser + AST) ──────────────────────────────────────
export * from './language/generated/ast.js';
export * from './language/generated/module.js';
export * from './language/memo-sysml-module.js';

// ─── Model (config, semantic, builder) ──────────────────────────────────────
// Re-export config types selectively to avoid name collision with AST's
// ViewpointDefinition (generated from grammar) vs config's ViewpointDefinition.
export {
    type ProjectType,
    type CosmaLayer,
    type RelationshipType,
    type SysMLConstruct,
    type KindDefinition,
    type ClosureRule,
    type ClosureRuleDefinition,
    type RuleCondition,
    type ViewpointDefinition as MEMOViewpointDefinition,
    type WorkflowStep,
    type WorkflowDefinition,
    type FirstRunConfig,
    type OntologyReference,
    type DiagramType,
    type DiagramDefinition,
    type MEMOConfig,
} from './model/config.js';
export * from './model/config-loader.js';
export * from './model/semantic.js';
export * from './model/parser-utils.js';
export * from './model/builder.js';
export * from './model/layer-resolver.js';
export * from './model/kind-registry.js';
export * from './model/relationship-registry.js';
export * from './model/ontology-loader.js';

// ─── Validation + Completeness ──────────────────────────────────────────────
export * from './validator/types.js';
export * from './validator/rule-engine.js';
export * from './validator/behavior-validator.js';
export * from './completeness/tracker.js';

// ─── Analysis ────────────────────────────────────────────────────────────────
export * from './analysis/impact.js';
export * from './analysis/dsm.js';

// ─── Serializer (CSV import/export, SysML generation) ───────────────────────
export * from './serializer/csv-io.js';
export * from './serializer/sysml-generator.js';

// ─── Protocol (WebSocket messages) ──────────────────────────────────────────
export * from './protocol/messages.js';
