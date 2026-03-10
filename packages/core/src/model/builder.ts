// ─── Model Builder ────────────────────────────────────────────────────────────
//
// Walks Langium AST documents and produces a serializable MemoModel.
// Maps SysML usages → MemoElements and ConnectionUsages → MemoRelationships.
//
// Key design decisions:
//   - usage.type (e.g. "Hazard") is matched against config.kinds for layer info
//   - ConnectionUsage.type (e.g. "Mitigates") → lowercase → matches config.relationshipTypes
//   - No cross-file reference resolution for MVP
//   - Doc comments are extracted from usage bodies
// ─────────────────────────────────────────────────────────────────────────────

import type {
    Model,
    PackageDeclaration,
    PartUsage,
    RequirementUsage,
    ActionUsage,
    PortUsage,
    ConnectionUsage,
    AttributeMember,
    DocComment,
    StringValue,
    IntValue,
    BooleanValue,
    EnumValue,
} from '../language/generated/ast.js';
import type { MEMOConfig, KindDefinition } from './config.js';
import type {
    MemoElement,
    MemoRelationship,
    MemoModel,
    ParseError,
} from './semantic.js';
import type { ParsedDocument } from './parser-utils.js';

let relationshipCounter = 0;

/**
 * Build a MemoModel from parsed documents and config.
 */
export function buildMemoModel(
    documents: ParsedDocument[],
    config: MEMOConfig,
    parseErrors: ParseError[] = []
): MemoModel {
    relationshipCounter = 0;
    const elements = new Map<string, MemoElement>();
    const relationships: MemoRelationship[] = [];
    const errors: ParseError[] = [...parseErrors];

    for (const { document, filePath } of documents) {
        const model = document.parseResult.value;
        extractFromModel(model, filePath, config, elements, relationships, errors);
    }

    // Build indexes
    const elementsByKind = new Map<string, MemoElement[]>();
    const elementsByLayer = new Map<string, MemoElement[]>();
    for (const el of elements.values()) {
        if (!elementsByKind.has(el.kind)) elementsByKind.set(el.kind, []);
        elementsByKind.get(el.kind)!.push(el);
        if (!elementsByLayer.has(el.layer)) elementsByLayer.set(el.layer, []);
        elementsByLayer.get(el.layer)!.push(el);
    }

    const relationshipsByType = new Map<string, MemoRelationship[]>();
    const outgoing = new Map<string, MemoRelationship[]>();
    const incoming = new Map<string, MemoRelationship[]>();
    for (const rel of relationships) {
        if (!relationshipsByType.has(rel.type)) relationshipsByType.set(rel.type, []);
        relationshipsByType.get(rel.type)!.push(rel);
        if (!outgoing.has(rel.sourceId)) outgoing.set(rel.sourceId, []);
        outgoing.get(rel.sourceId)!.push(rel);
        if (!incoming.has(rel.targetId)) incoming.set(rel.targetId, []);
        incoming.get(rel.targetId)!.push(rel);
    }

    return {
        elements,
        relationships,
        errors,
        elementsByKind,
        elementsByLayer,
        relationshipsByType,
        outgoing,
        incoming,
    };
}

// ─── AST Walking ────────────────────────────────────────────────────────────

function extractFromModel(
    model: Model,
    filePath: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    relationships: MemoRelationship[],
    errors: ParseError[]
): void {
    for (const member of model.members) {
        if (member.$type === 'PackageDeclaration') {
            extractFromPackage(member as PackageDeclaration, filePath, config, elements, relationships, errors);
        }
    }
}

function extractFromPackage(
    pkg: PackageDeclaration,
    filePath: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    relationships: MemoRelationship[],
    errors: ParseError[]
): void {
    for (const member of pkg.members) {
        switch (member.$type) {
            case 'PackageDeclaration':
                extractFromPackage(member as PackageDeclaration, filePath, config, elements, relationships, errors);
                break;
            case 'PartUsage':
                extractUsage(member as PartUsage, 'part', filePath, config, elements);
                break;
            case 'RequirementUsage':
                extractUsage(member as RequirementUsage, 'requirement', filePath, config, elements);
                break;
            case 'ActionUsage':
                extractUsage(member as ActionUsage, 'action', filePath, config, elements);
                break;
            case 'PortUsage':
                extractUsage(member as PortUsage, 'port', filePath, config, elements);
                break;
            case 'ConnectionUsage':
                extractConnection(member as ConnectionUsage, filePath, config, relationships);
                break;
            // Definitions (part def, interface def, etc.) inside packages are
            // ontology-level — we don't extract them as model elements in device projects
        }
    }
}

type UsageNode = PartUsage | RequirementUsage | ActionUsage | PortUsage;

function extractUsage(
    usage: UsageNode,
    construct: string,
    filePath: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>
): void {
    const id = usage.name;
    const typeName = usage.type; // e.g. "Hazard", "SystemRequirement"
    const kindDef = typeName ? config.kinds[typeName] : undefined;

    const attributes = extractAttributes(usage.body);
    const doc = extractDocComment(usage.body);

    // Human-readable name: prefer "attribute redefines name" over usage name
    const displayName = attributes['name'] || attributes['title'] || id;

    const element: MemoElement = {
        id,
        name: displayName,
        kind: typeName || 'Unknown',
        construct,
        layer: kindDef?.layer || 'unknown',
        file: filePath,
        attributes,
        doc,
    };

    elements.set(id, element);
}

function extractConnection(
    conn: ConnectionUsage,
    filePath: string,
    config: MEMOConfig,
    relationships: MemoRelationship[]
): void {
    const typeName = conn.type; // e.g. "Mitigates", "TraceTo"
    if (!typeName) return;

    // Normalize: "Mitigates" → "mitigates", "TraceTo" → "traceTo"
    const normalizedType = normalizeRelType(typeName);

    const sourceId = resolveRef(conn.source.ref);
    const targetId = resolveRef(conn.target.ref);
    if (!sourceId || !targetId) return;

    const rel: MemoRelationship = {
        id: `rel-${++relationshipCounter}`,
        type: normalizedType,
        sourceId,
        sourceEnd: conn.source.endName,
        targetId,
        targetEnd: conn.target.endName,
        file: filePath,
    };

    relationships.push(rel);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractAttributes(body: any[] | undefined): Record<string, string> {
    if (!body) return {};
    const attrs: Record<string, string> = {};

    for (const member of body) {
        if (member.$type === 'AttributeMember') {
            const attr = member as AttributeMember;
            if (attr.value) {
                attrs[attr.name] = extractAttributeValue(attr.value);
            } else if (attr.type) {
                attrs[attr.name] = `<${attr.type}>`;
            }
        }
    }

    return attrs;
}

function extractAttributeValue(value: any): string {
    if (!value) return '';
    switch (value.$type) {
        case 'StringValue':
            return (value as StringValue).value.replace(/^"|"$/g, '');
        case 'IntValue':
            return String((value as IntValue).value);
        case 'BooleanValue':
            return (value as BooleanValue).value;
        case 'EnumValue':
            return (value as EnumValue).enumRef;
        default:
            return String(value);
    }
}

function extractDocComment(body: any[] | undefined): string | undefined {
    if (!body) return undefined;
    const doc = body.find((m: any) => m.$type === 'DocComment') as DocComment | undefined;
    if (!doc) return undefined;
    return doc.content
        .replace(/^doc\s+\/\*\s*/, '')
        .replace(/\s*\*\/$/, '')
        .replace(/\n\s*\*\s?/g, ' ')
        .trim();
}

/**
 * Resolve a QualifiedName reference to just the local name.
 * In SysML v2 usages: `control ::> rcFlowRateLimiter` — ref is "rcFlowRateLimiter"
 */
function resolveRef(ref: string): string | undefined {
    if (!ref) return undefined;
    // Take the last segment of a qualified name
    const parts = ref.split('::');
    return parts[parts.length - 1] || undefined;
}

/**
 * Normalize relationship type name:
 *   PascalCase → camelCase for matching against config.relationshipTypes[].name
 *   "Mitigates" → "mitigates", "TraceTo" → "traceTo", "AllocateTo" → "allocateTo"
 */
function normalizeRelType(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1);
}
