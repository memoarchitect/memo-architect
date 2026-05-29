// ─── Rule Registry ───────────────────────────────────────────────────────────
//
// Discovers ConsistencyRule instances from parsed SysML documents.
// Converts them to ClosureRule format for the rule engine.
// Replaces YAML-based rule loading when ontology rules are available.
//
// Usage:
//   const registry = new RuleRegistry();
//   registry.populateFromDocuments(parsedDocs);
//   const rules = registry.toClosureRules();
// ─────────────────────────────────────────────────────────────────────────────

import type { ClosureRule, ClosureRuleDefinition, RuleCondition, RelationshipRuleDirection } from '../model/config.js';
import type { ParsedDocument } from '../model/parser-utils.js';

/** A consistency rule extracted from SysML ontology */
export interface RuleRegistryEntry {
    /** Rule ID from SysML attribute */
    id: string;
    /** Human-readable name */
    name: string;
    /** Description */
    description: string;
    /** Entity kind this rule applies to */
    appliesTo: string;
    /** Predicate kind (requireRelationship, requireAttribute, etc.) */
    predicate: string;
    /** Rule strength (optional, recommended, required, forbidden) */
    strength: string;
    /** Severity (error, warning, info) */
    severity: string;
    /** Rationale text */
    rationaleText: string;
    /** Rule category (closure, coverage, lifecycle, crossLayer, quantitative) */
    category: string;
    /** All raw attributes from the SysML instance */
    attributes: Record<string, string>;
    /** Source file path */
    file: string;
    /** Supertype chain (e.g. RelationshipConsistencyRule, ConsistencyRule) */
    superType?: string;
}

/**
 * Registry that discovers ConsistencyRule instances from SysML AST.
 * Walks part usages whose type specializes ConsistencyRule.
 */
export class RuleRegistry {
    private readonly rules = new Map<string, RuleRegistryEntry>();

    /** Known ConsistencyRule type hierarchy */
    private static readonly RULE_TYPES = new Set([
        'ConsistencyRule',
        'RelationshipConsistencyRule',
        'AttributeConsistencyRule',
        'ConditionalConsistencyRule',
        'CoverageConsistencyRule',
        // Methodology-level types that extend ConsistencyRule
        'ElementUsageRule',
        'RelationUsageRule',
    ]);

    /** Number of registered rules */
    get size(): number {
        return this.rules.size;
    }

    /** Get a rule by ID */
    getRule(id: string): RuleRegistryEntry | undefined {
        return this.rules.get(id);
    }

    /** Get all rules */
    entries(): RuleRegistryEntry[] {
        return Array.from(this.rules.values());
    }

    /** Get rules filtered by category */
    byCategory(category: string): RuleRegistryEntry[] {
        return this.entries().filter(r => r.category === category);
    }

    /** Get rules filtered by standard (for coverage rules) */
    byStandard(standard: string): RuleRegistryEntry[] {
        return this.entries().filter(r => r.attributes['standard'] === standard);
    }

    /** Check if a rule is registered */
    has(id: string): boolean {
        return this.rules.has(id);
    }

    /** Register a rule manually (for testing) */
    register(entry: RuleRegistryEntry): void {
        this.rules.set(entry.id, entry);
    }

    /**
     * Populate registry from parsed SysML documents.
     * Looks for part usages whose type is a known ConsistencyRule subtype.
     */
    populateFromDocuments(docs: ParsedDocument[]): void {
        for (const doc of docs) {
            const model = doc.document.parseResult?.value;
            if (!model) continue;

            for (const member of (model as any).members ?? []) {
                if (member.$type === 'PackageDeclaration') {
                    this.walkPackage(member, doc.filePath);
                }
            }
        }
    }

    private walkPackage(pkg: any, filePath: string): void {
        for (const member of pkg.members ?? []) {
            if (member.$type === 'PackageDeclaration') {
                this.walkPackage(member, filePath);
            } else if (member.$type === 'PartUsage') {
                this.tryExtractRule(member, filePath);
            }
        }
    }

    private tryExtractRule(usage: any, filePath: string): void {
        const typeName = usage.type;
        if (!typeName || !RuleRegistry.RULE_TYPES.has(typeName)) return;

        const attrs = this.extractAttributes(usage.body);
        const id = attrs['id'];
        if (!id) return; // Rules must have an ID

        const entry: RuleRegistryEntry = {
            id,
            name: attrs['name'] ?? usage.name ?? id,
            description: attrs['description'] ?? '',
            appliesTo: attrs['appliesTo'] ?? '',
            predicate: attrs['predicate'] ?? '',
            strength: attrs['strength'] ?? 'recommended',
            severity: attrs['severity'] ?? 'warning',
            rationaleText: attrs['rationaleText'] ?? '',
            category: attrs['category'] ?? 'closure',
            attributes: attrs,
            file: filePath,
            superType: typeName,
        };

        this.rules.set(id, entry);
    }

    private extractAttributes(body: any[] | undefined): Record<string, string> {
        if (!body) return {};
        const attrs: Record<string, string> = {};
        for (const member of body) {
            if (member.$type === 'AttributeMember' && member.value) {
                attrs[member.name] = this.extractValue(member.value);
            }
        }
        return attrs;
    }

    private extractValue(value: any): string {
        if (!value) return '';
        switch (value.$type) {
            case 'StringValue':
                return value.value?.replace(/^"|"$/g, '') ?? '';
            case 'IntValue':
                return String(value.value);
            case 'BooleanValue':
                return value.value;
            case 'EnumValue': {
                // Strip enum type prefix: "RuleStrengthKind::required" → "required"
                const ref: string = value.enumRef ?? '';
                const colonIdx = ref.lastIndexOf('::');
                return colonIdx >= 0 ? ref.slice(colonIdx + 2) : ref;
            }
            default:
                return String(value);
        }
    }

    /**
     * Convert all registered rules to ClosureRule format
     * for backward compatibility with the rule engine.
     */
    toClosureRules(): ClosureRule[] {
        const result: ClosureRule[] = [];

        for (const entry of this.rules.values()) {
            const closureRule = this.toClosureRule(entry);
            if (closureRule) {
                result.push(closureRule);
            }
        }

        return result;
    }

    /**
     * Convert a single registry entry to ClosureRule.
     * Returns undefined for rule types that don't map to closure rules (e.g. coverage).
     */
    private toClosureRule(entry: RuleRegistryEntry): ClosureRule | undefined {
        const ruleDef = this.buildRuleDefinition(entry);
        if (!ruleDef) return undefined;

        return {
            id: entry.id,
            description: entry.description,
            entity: entry.appliesTo,
            rule: ruleDef,
            severity: this.mapSeverity(entry.severity),
        };
    }

    private buildRuleDefinition(entry: RuleRegistryEntry): ClosureRuleDefinition | undefined {
        const predicate = entry.predicate;
        const attrs = entry.attributes;

        switch (predicate) {
            case 'requireRelationship':
                return {
                    type: 'requireRelationship',
                    relationship: attrs['relationshipType'] ?? '',
                    min: parseInt(attrs['minCount'] ?? '1', 10),
                    max: attrs['maxCount'] ? parseInt(attrs['maxCount'], 10) : undefined,
                    direction: this.mapDirection(attrs['direction']),
                    relatedKinds: this.parseList(attrs['relatedKinds']),
                };

            case 'conditionalRequireRelationship':
                return {
                    type: 'conditionalRequireRelationship',
                    condition: this.buildCondition(attrs),
                    relationship: attrs['relationshipType'] ?? '',
                    min: parseInt(attrs['minCount'] ?? '1', 10),
                    direction: this.mapDirection(attrs['direction']),
                    relatedKinds: this.parseList(attrs['relatedKinds']),
                };

            case 'requireAttribute':
                return {
                    type: 'requireAttribute',
                    attribute: attrs['targetAttribute'] ?? '',
                };

            case 'uniqueAttribute':
                return {
                    type: 'uniqueAttribute',
                    attribute: attrs['targetAttribute'] ?? '',
                };

            case 'cardinalityCheck':
                return {
                    type: 'cardinalityCheck',
                    relationship: attrs['relationshipType'] ?? '',
                    min: parseInt(attrs['minCount'] ?? '0', 10),
                    max: parseInt(attrs['maxCount'] ?? '999', 10),
                    direction: this.mapDirection(attrs['direction']),
                    relatedKinds: this.parseList(attrs['relatedKinds']),
                };

            case 'coverageCheck':
                // Coverage rules don't map to closure rules
                return undefined;

            default:
                return undefined;
        }
    }

    private buildCondition(attrs: Record<string, string>): RuleCondition {
        return {
            attribute: attrs['conditionAttribute'] ?? '',
            operator: (attrs['conditionOperator'] as RuleCondition['operator']) ?? 'eq',
            values: this.parseList(attrs['conditionValues']) ?? [],
        };
    }

    private mapDirection(dir?: string): RelationshipRuleDirection {
        if (dir === 'incoming' || dir === 'outgoing') return dir;
        return 'any';
    }

    private mapSeverity(severity: string): 'error' | 'warning' | 'info' {
        if (severity === 'error' || severity === 'warning' || severity === 'info') return severity;
        return 'warning';
    }

    private parseList(value?: string): string[] | undefined {
        if (!value) return undefined;
        const items = value.split(',').map(s => s.trim()).filter(Boolean);
        return items.length > 0 ? items : undefined;
    }
}
