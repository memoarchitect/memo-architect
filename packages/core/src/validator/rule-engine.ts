// ─── Closure Rule Engine ──────────────────────────────────────────────────────
//
// Evaluates closure rules from the config against the built model.
// Returns violations for elements that fail their rules.
// ─────────────────────────────────────────────────────────────────────────────

import type { MEMOConfig, ClosureRule, ClosureRuleDefinition, RuleCondition, RelationshipRuleDirection } from '../model/config.js';
import type { MemoModel, MemoElement, MemoRelationship } from '../model/semantic.js';
import type { Violation, ValidationResult } from './types.js';
import { validateBehavior } from './behavior-validator.js';

/**
 * Full model validation: closure rules + built-in structural checks.
 * Preferred entry point — combines all validation passes.
 */
export function validateModel(
    model: MemoModel,
    config: MEMOConfig
): ValidationResult {
    const closureResult = evaluateClosureRules(model, config);
    const behaviorViolations = validateBehavior(model);

    return {
        violations: [...closureResult.violations, ...behaviorViolations],
        rulesEvaluated: closureResult.rulesEvaluated + (behaviorViolations.length > 0 ? 3 : 3),
        rulesPassed: closureResult.rulesPassed,
        timestamp: Date.now(),
    };
}

/**
 * Evaluate all closure rules against the model.
 */
export function evaluateClosureRules(
    model: MemoModel,
    config: MEMOConfig
): ValidationResult {
    const violations: Violation[] = [];
    let rulesEvaluated = 0;
    let rulesPassed = 0;

    for (const rule of config.closureRules) {
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
