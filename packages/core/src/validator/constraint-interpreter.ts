// ─── Constraint Interpreter (B6a) ────────────────────────────────────────────
//
// Internal interface for evaluating constraints from different sources:
//   - ClosureRules from config (legacy YAML path)
//   - ConsistencyRules from SysML model registry (new path)
//
// The interpreter normalizes both sources into a common evaluation pipeline
// so the rule engine doesn't need to know the rule's origin.
// ─────────────────────────────────────────────────────────────────────────────

import type { ClosureRule } from '../model/config.js';
import type { MemoModel } from '../model/semantic.js';
import type { Violation } from './types.js';
import type { RuleRegistry, RuleRegistryEntry } from './rule-registry.js';

/** Source of a constraint: either config YAML or SysML ontology */
export type ConstraintSource = 'config' | 'ontology';

/** A normalized constraint ready for evaluation */
export interface NormalizedConstraint {
    /** The closure rule to evaluate */
    rule: ClosureRule;
    /** Where this constraint came from */
    source: ConstraintSource;
    /** Original rule registry entry (if from ontology) */
    registryEntry?: RuleRegistryEntry;
}

/**
 * Constraint interpreter that merges rules from config and ontology.
 * Ontology rules take precedence when IDs collide.
 */
export class ConstraintInterpreter {
    private constraints: NormalizedConstraint[] = [];

    /**
     * Load constraints from config closure rules (legacy path).
     */
    loadFromConfig(closureRules: ClosureRule[]): void {
        for (const rule of closureRules) {
            this.constraints.push({
                rule,
                source: 'config',
            });
        }
    }

    /**
     * Load constraints from a RuleRegistry (new ontology path).
     * Ontology rules with same ID replace config rules.
     */
    loadFromRegistry(registry: RuleRegistry): void {
        const ontologyRules = registry.toClosureRules();
        const ontologyEntries = registry.entries();
        const entryById = new Map(ontologyEntries.map(e => [e.id, e]));

        for (const rule of ontologyRules) {
            // Remove any config rule with same ID
            this.constraints = this.constraints.filter(c => c.rule.id !== rule.id);

            this.constraints.push({
                rule,
                source: 'ontology',
                registryEntry: entryById.get(rule.id),
            });
        }
    }

    /**
     * Get all normalized constraints, ready for the rule engine.
     */
    getConstraints(): NormalizedConstraint[] {
        return this.constraints;
    }

    /**
     * Get constraints as plain ClosureRule array (for backward compat).
     */
    toClosureRules(): ClosureRule[] {
        return this.constraints.map(c => c.rule);
    }

    /** Number of loaded constraints */
    get size(): number {
        return this.constraints.length;
    }

    /** Get constraints by source */
    bySource(source: ConstraintSource): NormalizedConstraint[] {
        return this.constraints.filter(c => c.source === source);
    }

    /** Clear all constraints */
    clear(): void {
        this.constraints = [];
    }
}
