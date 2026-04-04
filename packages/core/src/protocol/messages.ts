// ─── WebSocket Protocol Messages ──────────────────────────────────────────────
//
// Shared types for the CLI dev server ↔ Web app WebSocket protocol.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '../model/semantic.js';
import type { ValidationResult, CompletenessReport } from '../validator/types.js';

// ─── Server → Client ────────────────────────────────────────────────────────

export type ServerMessage =
    | ModelUpdateMessage
    | ValidationUpdateMessage
    | CompletenessUpdateMessage
    | ErrorMessage
    | ImportResultMessage
    | DiagramParseResultMessage;

export interface ModelUpdateMessage {
    type: 'model:update';
    payload: MemoModelDTO;
}

export interface ValidationUpdateMessage {
    type: 'validation:update';
    payload: ValidationResult;
}

export interface CompletenessUpdateMessage {
    type: 'completeness:update';
    payload: CompletenessReport;
}

export interface ErrorMessage {
    type: 'error';
    payload: { message: string };
}

// ─── Client → Server ────────────────────────────────────────────────────────

export type ClientMessage =
    | RequestRefreshMessage
    | ElementUpdateMessage
    | ElementCreateMessage
    | AddRelationshipMessage
    | CsvImportMessage
    | DiagramCreateMessage
    | DiagramUpdateMessage
    | DiagramDeleteMessage
    | DiagramParseMessage;

export interface RequestRefreshMessage {
    type: 'request:refresh';
}

/** Client requests an element field update (2-way sync) */
export interface ElementUpdateMessage {
    type: 'element:update';
    payload: {
        elementId: string;
        doc?: string;
        attributes?: Record<string, string>;
    };
}

/** Client requests a new element creation in SysML */
export interface ElementCreateMessage {
    type: 'element:create';
    payload: {
        name: string;
        kind: string;
        construct: string;
        attributes?: Record<string, string>;
    };
}

/** Client requests a new relationship between two elements */
export interface AddRelationshipMessage {
    type: 'relationship:add';
    payload: {
        sourceId: string;
        targetId: string;
        type: string;
    };
}

/** Client sends CSV data for bulk import of elements and/or relationships */
export interface CsvImportMessage {
    type: 'csv:import';
    payload: {
        /** CSV text for elements (optional — can import only relationships) */
        elementsCsv?: string;
        /** CSV text for relationships (optional — can import only elements) */
        relationshipsCsv?: string;
        /** Target package name for generated SysML file */
        packageName?: string;
        /** Target .sysml file path (relative to project root) */
        targetFile?: string;
    };
}

/** Client creates a new user diagram under a viewpoint */
export interface DiagramCreateMessage {
    type: 'diagram:create';
    payload: {
        id: string;
        name: string;
        diagramType: string;
        viewpointId: string;
        description?: string;
        properties?: Record<string, string>;
        elementIds?: string[];
        relationshipTypes?: string[];
    };
}

/** Client updates an existing diagram's metadata */
export interface DiagramUpdateMessage {
    type: 'diagram:update';
    payload: {
        id: string;
        name?: string;
        description?: string;
        properties?: Record<string, string>;
        elementIds?: string[];
        relationshipTypes?: string[];
    };
}

/** Client deletes a user-created diagram */
export interface DiagramDeleteMessage {
    type: 'diagram:delete';
    payload: { id: string };
}

/** Client requests server-side SysML parse to extract element IDs */
export interface DiagramParseMessage {
    type: 'diagram:parse';
    payload: {
        diagramId: string;
        text: string;
    };
}

/** Server responds with parsed element IDs (or errors) */
export interface DiagramParseResultMessage {
    type: 'diagram:parse:result';
    payload: {
        diagramId: string;
        elementIds: string[];
        errors: string[];
    };
}

/** Server responds with CSV import results */
export interface ImportResultMessage {
    type: 'import:result';
    payload: {
        success: boolean;
        elementsImported: number;
        relationshipsImported: number;
        errors: string[];
        warnings: string[];
        /** Path to generated .sysml file */
        generatedFile?: string;
    };
}
