// ─── Closure Rule Engine ──────────────────────────────────────────────────────
//
// Evaluates closure rules against the built model.
// Supports two rule sources:
//   1. Config closure rules (legacy YAML/config path)
//   2. RuleRegistry (SysML ontology path via ConstraintInterpreter)
//
// The validateModel / evaluateClosureRules functions accept either a config
// or a plain ClosureRule[] array, so callers can supply rules from any source.
// ─────────────────────────────────────────────────────────────────────────────

import type { MEMOConfig, ClosureRule, ClosureRuleDefinition, RuleCondition, RelationshipRuleDirection } from '../model/config.js';
import type { MemoModel, MemoElement, MemoRelationship } from '../model/semantic.js';
import type { Violation, ValidationResult } from './types.js';
import type { CompiledConstraint } from './constraint-eval.js';
import { evaluateConstraintNode } from './constraint-eval.js';
import { validateBehavior } from './behavior-validator.js';

/**
 * Full model validation: native constraints + closure rules + structural checks.
 * Preferred entry point — combines all validation passes.
 *
 * @param configOrRules     a MEMOConfig (backward compat) or a plain ClosureRule[] array.
 * @param nativeConstraints constraints compiled from ontology `constraint def` bodies
 *                          (see collectNativeConstraints). Epic EE-3 evaluates these
 *                          as native KerML expressions alongside the legacy closure path.
 */
export function validateModel(
    model: MemoModel,
    configOrRules: MEMOConfig | ClosureRule[],
    nativeConstraints: CompiledConstraint[] = []
): ValidationResult {
    const closureResult = evaluateClosureRules(model, configOrRules);
    const behaviorViolations = validateBehavior(model);

    const nativeViolations: Violation[] = [];
    let nativePassed = 0;
    for (const constraint of nativeConstraints) {
        const violations = evaluateConstraintNode(constraint, constraint.ast, model);
        if (violations.length === 0) nativePassed++;
        nativeViolations.push(...violations);
    }

    return {
        violations: [...closureResult.violations, ...behaviorViolations, ...nativeViolations],
        rulesEvaluated: closureResult.rulesEvaluated + 3 + nativeConstraints.length,
        rulesPassed: closureResult.rulesPassed + nativePassed,
        timestamp: Date.now(),
    };
}

/**
 * Evaluate all closure rules against the model.
 *
 * Accepts either a MEMOConfig (backward compat) or a plain ClosureRule[] array.
 * When a ClosureRule[] is passed, rules are evaluated directly without config lookup.
 */
export function evaluateClosureRules(
    model: MemoModel,
    configOrRules: MEMOConfig | ClosureRule[]
): ValidationResult {
    const rules: ClosureRule[] = Array.isArray(configOrRules)
        ? configOrRules
        : configOrRules.closureRules;

    const violations: Violation[] = [];
    let rulesEvaluated = 0;
    let rulesPassed = 0;

    for (const rule of rules) {
        rulesEvaluated++;
        const elements = model.elementsByKind.get(rule.entity) || [];

        if (elements.length === 0) {
            // No elements of this kind — rule passes vacuously
            rulesPassed++;
            continue;
        }

        let ruleHasViolation = false;

        for (const element of elements) {
            const violated = evaluateRule(rule, element, model);
            if (violated) {
                ruleHasViolation = true;
                violations.push({
                    ruleId: rule.id,
                    description: rule.description,
                    severity: rule.severity,
                    elementId: element.id,
                    elementKind: element.kind,
                    elementName: element.name,
                    layer: element.layer,
                });
            }
        }

        if (!ruleHasViolation) rulesPassed++;
    }

    return {
        violations,
        rulesEvaluated,
        rulesPassed,
        timestamp: Date.now(),
    };
}

function evaluateRule(rule: ClosureRule, element: MemoElement, model: MemoModel): boolean {
        const def = rule.rule;
    switch (def.type) {
        case 'requireRelationship':
            return !checkRequireRelationship(
                element,
                def.relationship,
                def.min,
                def.max,
                model,
                def.direction,
                def.relatedKinds
            );
        case 'conditionalRequireRelationship':
            return checkCondition(element, def.condition)
                && !checkRequireRelationship(
                    element,
                    def.relationship,
                    def.min,
                    undefined,
                    model,
                    def.direction,
                    def.relatedKinds
                );
        case 'requireAttribute':
            return !checkRequireAttribute(element, def.attribute);
        case 'uniqueAttribute':
            return !checkUniqueAttribute(element, def.attribute, model);
        case 'cardinalityCheck':
            return !checkRequireRelationship(
                element,
                def.relationship,
                def.min,
                def.max,
                model,
                def.direction,
                def.relatedKinds
            );
        default:
            return false;
    }
}

/**
 * Check if element has the required number of relationships of a given type.
 * Relationships are matched by type name (normalized to lowercase).
 * An element participates in a relationship if it's either source or target.
 */
function checkRequireRelationship(
    element: MemoElement,
    relType: string,
    min: number,
    max: number | undefined,
    model: MemoModel,
    direction: RelationshipRuleDirection = 'any',
    relatedKinds?: string[]
): boolean {
    const relevant = getRelevantRelationships(element, relType, model, direction, relatedKinds);
    const count = relevant.length;

    if (count < min) return false;
    if (max !== undefined && count > max) return false;
    return true;
}

function getRelevantRelationships(
    element: MemoElement,
    relType: string,
    model: MemoModel,
    direction: RelationshipRuleDirection,
    relatedKinds?: string[]
): MemoRelationship[] {
    const directions = direction === 'any' ? ['outgoing', 'incoming'] : [direction];
    const matchingKinds = relatedKinds ? new Set(relatedKinds) : undefined;
    const relationships: MemoRelationship[] = [];

    for (const dir of directions) {
        const candidates =
            dir === 'outgoing'
                ? (model.outgoing.get(element.id) || [])
                : (model.incoming.get(element.id) || []);

        for (const rel of candidates) {
            if (rel.type !== relType) continue;

            if (matchingKinds) {
                const relatedId = dir === 'outgoing' ? rel.targetId : rel.sourceId;
                const related = model.elements.get(relatedId);
                if (!related || !matchingKinds.has(related.kind)) continue;
            }

            relationships.push(rel);
        }
    }

    return relationships;
}

function checkRequireAttribute(element: MemoElement, attribute: string): boolean {
    const value = element.attributes[attribute];
    return value !== undefined && value !== '';
}

function checkUniqueAttribute(element: MemoElement, attribute: string, model: MemoModel): boolean {
    const value = element.attributes[attribute];
    if (!value) return true; // No value → not a duplicate

    const sameKind = model.elementsByKind.get(element.kind) || [];
    const duplicates = sameKind.filter(e => e.id !== element.id && e.attributes[attribute] === value);
    return duplicates.length === 0;
}

function checkCondition(element: MemoElement, condition: RuleCondition): boolean {
    const value = element.attributes[condition.attribute];
    if (value === undefined) return false;

    switch (condition.operator) {
        case 'eq':
            return condition.values.includes(value);
        case 'neq':
            return !condition.values.includes(value);
        case 'in':
            return condition.values.includes(value);
        case 'gte':
            return Number(value) >= Number(condition.values[0]);
        case 'lte':
            return Number(value) <= Number(condition.values[0]);
        default:
            return false;
    }
}
