// ─── Closure Rule Engine ──────────────────────────────────────────────────────
//
// Evaluates closure rules from the config against the built model.
// Returns violations for elements that fail their rules.
// ─────────────────────────────────────────────────────────────────────────────

import type { MEMOConfig, ClosureRule, ClosureRuleDefinition, RuleCondition } from '../model/config.js';
import type { MemoModel, MemoElement, MemoRelationship } from '../model/semantic.js';
import type { Violation, ValidationResult } from './types.js';

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
            return !checkRequireRelationship(element, def.relationship, def.min, def.max, model);
        case 'conditionalRequireRelationship':
            return checkCondition(element, def.condition)
                && !checkRequireRelationship(element, def.relationship, def.min, undefined, model);
        case 'requireAttribute':
            return !checkRequireAttribute(element, def.attribute);
        case 'uniqueAttribute':
            return !checkUniqueAttribute(element, def.attribute, model);
        case 'cardinalityCheck':
            return !checkRequireRelationship(element, def.relationship, def.min, def.max, model);
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
    model: MemoModel
): boolean {
    const outgoing = model.outgoing.get(element.id) || [];
    const incoming = model.incoming.get(element.id) || [];
    const all = [...outgoing, ...incoming];

    const count = all.filter(r => r.type === relType).length;

    if (count < min) return false;
    if (max !== undefined && count > max) return false;
    return true;
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
