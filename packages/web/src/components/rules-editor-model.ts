// ─── The rule editor's logic ─────────────────────────────────────────────────
//
// What the rule list shows and what the new-rule form sends, apart from React so
// it can be tested. The server decides what is valid (rule-service.ts); the
// checks here only keep the buttons honest, the same way the tailoring form
// mirrors its refusals: a disabled button for the reason the write would be
// rejected, and the real check on the other side.
// (plans/memo-rules-domain-trace-and-editor.md)
// ─────────────────────────────────────────────────────────────────────────────

import type { ClauseFact, ConditionSpec, RuleFormPayload } from '@memoarchitect/tools/browser';

export type RuleDomain = 'modelling' | 'medicalDevice' | 'organisation';
export type DomainFilter = 'all' | RuleDomain;

export const DOMAIN_LABEL: Record<RuleDomain, string> = {
    modelling: 'Modelling',
    medicalDevice: 'Medical device',
    organisation: 'Organisation',
};

/** A rule's normative strength: a standard's shall, should and may. Separate from how a violation is reported. */
export type RuleObligation = 'required' | 'recommended' | 'bestPractice';
export const OBLIGATIONS: readonly RuleObligation[] = ['required', 'recommended', 'bestPractice'];
export type ObligationFilter = 'any' | RuleObligation;

export const OBLIGATION_LABEL: Record<RuleObligation, string> = {
    required: 'Required',
    recommended: 'Recommended',
    bestPractice: 'Best practice',
};

/** The severity a rule takes when it states none: what `memo-architect new rule` and the tools default to. */
export function severityForObligation(obligation: RuleObligation | ''): 'error' | 'warning' | 'info' {
    return obligation === 'required' ? 'error' : obligation === 'bestPractice' ? 'info' : 'warning';
}

/** The parts of an effective rule the editor reads. */
export interface EditorRule {
    sourceRuleId: string;
    sourceRuleType: string;
    disposition: 'enabled' | 'disabled' | 'replaced';
    declaredSeverity: string;
    effectiveSeverity: string;
    tailoring: string;
    domain?: RuleDomain;
    obligation?: RuleObligation;
    enforces?: readonly string[];
}

export type RuleState = 'on' | 'off' | 'replaced' | 'severity changed';

export function ruleState(rule: Pick<EditorRule, 'disposition' | 'declaredSeverity' | 'effectiveSeverity'>): RuleState {
    if (rule.disposition === 'disabled') return 'off';
    if (rule.disposition === 'replaced') return 'replaced';
    return rule.effectiveSeverity !== rule.declaredSeverity ? 'severity changed' : 'on';
}

export interface RuleRow {
    id: string;
    type: string;
    domain: RuleDomain | 'unstated';
    severity: string;
    state: RuleState;
    invariant: boolean;
    obligation: RuleObligation | 'unstated';
    /** The rule's `EnforcesClause` traces. Zero is allowed: a rule need not trace to a standard. */
    clauses: { qualifiedName: string; label: string }[];
}

/** `ISO 14971:2019 §7`, or the qualified name when the model does not carry the clause. */
export function clauseLabel(clauses: readonly ClauseFact[], qualifiedName: string): string {
    const fact = clauses.find(c => c.qualifiedName === qualifiedName);
    return fact ? `${fact.standard} §${fact.clauseNumber}` : qualifiedName;
}

export function ruleRows(
    rules: readonly EditorRule[], clauses: readonly ClauseFact[], filter: DomainFilter, search: string,
    obligation: ObligationFilter = 'any',
): RuleRow[] {
    const needle = search.trim().toLowerCase();
    return rules
        .filter(rule => filter === 'all' || rule.domain === filter)
        .filter(rule => obligation === 'any' || rule.obligation === obligation)
        .map<RuleRow>(rule => ({
            id: rule.sourceRuleId,
            type: rule.sourceRuleType,
            domain: rule.domain ?? 'unstated',
            severity: rule.effectiveSeverity,
            state: ruleState(rule),
            invariant: rule.tailoring === 'invariant',
            obligation: rule.obligation ?? 'unstated',
            clauses: (rule.enforces ?? []).map(qualifiedName => ({ qualifiedName, label: clauseLabel(clauses, qualifiedName) })),
        }))
        .filter(row => !needle
            || row.id.toLowerCase().includes(needle)
            || row.type.toLowerCase().includes(needle)
            || row.obligation.toLowerCase().includes(needle)
            || row.clauses.some(c => c.label.toLowerCase().includes(needle)))
        .sort((a, b) => a.id.localeCompare(b.id));
}

export function domainCounts(rules: readonly Pick<EditorRule, 'domain'>[]): Record<DomainFilter, number> {
    const counts: Record<DomainFilter, number> = { all: rules.length, modelling: 0, medicalDevice: 0, organisation: 0 };
    for (const rule of rules) if (rule.domain) counts[rule.domain]++;
    return counts;
}

/** Clauses matching what was typed: the standard, the clause number or its scope phrase. */
export function searchClauses(clauses: readonly ClauseFact[], text: string, limit = 12): ClauseFact[] {
    const needle = text.trim().toLowerCase();
    if (!needle) return [];
    const terms = needle.split(/\s+/);
    return clauses
        .filter(c => {
            const haystack = `${c.standard} §${c.clauseNumber} ${c.clauseNumber} ${c.title ?? ''}`.toLowerCase();
            return terms.every(term => haystack.includes(term));
        })
        .slice(0, limit);
}

// ─── The new-rule form ───────────────────────────────────────────────────────

export type ConditionKind = ConditionSpec['kind'];

export const CONDITION_LABEL: Record<ConditionKind, string> = {
    atLeast: 'must have at least N of a relation',
    atMost: 'must have at most N of a relation',
    attributeSet: 'must have an attribute set',
    expression: 'a condition written out',
};

export interface RuleFormState {
    id: string;
    typeName: string;
    appliesTo: string;
    conditionKind: ConditionKind;
    relation: string;
    count: string;
    attribute: string;
    expression: string;
    /** Empty: the severity the obligation implies. */
    severity: 'error' | 'warning' | 'info' | '';
    obligation: RuleObligation | '';
    rationale: string;
    enforces: string[];
    file: string;
}

export const EMPTY_FORM: RuleFormState = {
    id: '', typeName: '', appliesTo: '', conditionKind: 'atLeast', relation: '', count: '1', attribute: '',
    expression: '', severity: '', obligation: '', rationale: '', enforces: [], file: '',
};

export function conditionOf(form: RuleFormState): ConditionSpec | undefined {
    switch (form.conditionKind) {
        case 'atLeast':
        case 'atMost': {
            const count = Number(form.count);
            if (!form.relation.trim() || form.count.trim() === '' || !Number.isInteger(count) || count < 0) return undefined;
            return { kind: form.conditionKind, relation: form.relation.trim(), count };
        }
        case 'attributeSet':
            return form.attribute.trim() ? { kind: 'attributeSet', attribute: form.attribute.trim() } : undefined;
        case 'expression':
            return form.expression.trim() ? { kind: 'expression', expression: form.expression.trim() } : undefined;
    }
}

/** What is still missing before the form can be previewed. Empty means it can. */
export function formGaps(form: RuleFormState): string[] {
    const gaps: string[] = [];
    if (!form.id.trim()) gaps.push('an id');
    if (!form.typeName.trim()) gaps.push('a name');
    if (!form.appliesTo.trim()) gaps.push('what it applies to');
    if (!conditionOf(form)) gaps.push('a condition');
    if (!form.rationale.trim()) gaps.push('a rationale');
    if (!form.file.trim()) gaps.push('a file to write it into');
    return gaps;
}

/** A suggested definition name from an id-free title, so the person need not invent one. */
export function suggestTypeName(text: string): string {
    const words = text.replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
    const name = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    return name && /^[A-Z]/.test(name) ? name : '';
}

export function toPayload(form: RuleFormState): Omit<RuleFormPayload, 'requestId'> | undefined {
    const condition = conditionOf(form);
    if (!condition || formGaps(form).length > 0) return undefined;
    return {
        id: form.id.trim(),
        typeName: form.typeName.trim(),
        appliesTo: form.appliesTo.trim(),
        condition,
        severity: form.severity || severityForObligation(form.obligation),
        ...(form.obligation ? { obligation: form.obligation } : {}),
        rationaleText: form.rationale.trim(),
        ...(form.enforces.length > 0 ? { enforces: form.enforces } : {}),
        file: form.file.trim(),
    };
}

/** The statement a chosen clause is written as, so the form shows the trace and not only the clause. */
export function traceStatement(typeName: string, clauseQualifiedName: string): string {
    return `#EnforcesClause dependency from ${typeName.trim() || '<rule>'} to ${clauseQualifiedName};`;
}
