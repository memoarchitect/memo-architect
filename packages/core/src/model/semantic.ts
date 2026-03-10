// ─── MEMO Semantic Model ──────────────────────────────────────────────────────
//
// Serializable model types produced by the builder from parsed AST.
// These types are what the CLI and web app work with — they are
// decoupled from Langium's AST nodes so they can be sent over WebSocket.
// ─────────────────────────────────────────────────────────────────────────────

/** A model element (part, requirement, action, port, etc.) */
export interface MemoElement {
    /** Unique element identifier (usage name from SysML) */
    id: string;
    /** Human-readable name (from 'attribute redefines name = ...' or id) */
    name: string;
    /** The kind key matching config.kinds, e.g. "Hazard", "SystemRequirement" */
    kind: string;
    /** SysML v2 construct: 'part', 'requirement', 'action', 'port' */
    construct: string;
    /** CoSMA layer from config, e.g. "risk", "requirements" */
    layer: string;
    /** Source file path (relative) */
    file: string;
    /** All attributes as key-value pairs */
    attributes: Record<string, string>;
    /** Doc comment if present */
    doc?: string;
}

/** A typed relationship between two elements */
export interface MemoRelationship {
    /** Unique relationship id (auto-generated) */
    id: string;
    /** Relationship type name (lowercase), e.g. "mitigates", "traceTo" */
    type: string;
    /** Source element id */
    sourceId: string;
    /** Source end name from connection usage, e.g. "control" */
    sourceEnd: string;
    /** Target element id */
    targetId: string;
    /** Target end name from connection usage, e.g. "hazard" */
    targetEnd: string;
    /** Source file path (relative) */
    file: string;
}

/** A parse error from a specific file */
export interface ParseError {
    /** File path */
    file: string;
    /** Error message */
    message: string;
    /** Line number (1-based) */
    line?: number;
    /** Column number (1-based) */
    column?: number;
}

/** The complete semantic model — serializable for WebSocket transport */
export interface MemoModel {
    /** All elements indexed by id */
    elements: Map<string, MemoElement>;
    /** All relationships */
    relationships: MemoRelationship[];
    /** Parse errors encountered */
    errors: ParseError[];

    // ─── Derived indexes (computed by builder) ──────────────────────────

    /** Elements grouped by kind */
    elementsByKind: Map<string, MemoElement[]>;
    /** Elements grouped by CoSMA layer */
    elementsByLayer: Map<string, MemoElement[]>;
    /** Relationships grouped by type */
    relationshipsByType: Map<string, MemoRelationship[]>;
    /** Outgoing relationships from element id */
    outgoing: Map<string, MemoRelationship[]>;
    /** Incoming relationships to element id */
    incoming: Map<string, MemoRelationship[]>;
}

/** Serializable version of MemoModel for JSON transport */
export interface MemoModelDTO {
    elements: Record<string, MemoElement>;
    relationships: MemoRelationship[];
    errors: ParseError[];
}

/** Convert MemoModel to a plain JSON-serializable object */
export function modelToDTO(model: MemoModel): MemoModelDTO {
    const elements: Record<string, MemoElement> = {};
    for (const [id, el] of model.elements) {
        elements[id] = el;
    }
    return {
        elements,
        relationships: model.relationships,
        errors: model.errors,
    };
}

/** Reconstruct a MemoModel from a DTO (e.g. received over WebSocket) */
export function dtoToModel(dto: MemoModelDTO): MemoModel {
    const elements = new Map<string, MemoElement>(Object.entries(dto.elements));
    const relationships = dto.relationships;

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
        errors: dto.errors,
        elementsByKind,
        elementsByLayer,
        relationshipsByType,
        outgoing,
        incoming,
    };
}
