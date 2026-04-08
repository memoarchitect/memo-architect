// ─── WebSocket Protocol Messages ──────────────────────────────────────────────
//
// Shared types for the CLI dev server ↔ Web app WebSocket protocol.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '../model/semantic.js';
import type { ValidationResult, CompletenessReport } from '../validator/types.js';
import type { OntologyPackageInfo } from '../model/ontology-loader.js';

// ─── Server → Client ────────────────────────────────────────────────────────

export type ServerMessage =
    | ModelUpdateMessage
    | ValidationUpdateMessage
    | CompletenessUpdateMessage
    | ErrorMessage
    | ImportResultMessage
    | DiagramParseResultMessage
    | OntologyPackagesMessage
    | DiagramLayoutMessage;

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

/** Server sends ontology package metadata when client connects or memo.package.yaml changes */
export interface OntologyPackagesMessage {
    type: 'ontology:packages';
    payload: { packages: OntologyPackageInfo[] };
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
    | DiagramParseMessage
    | OntologySaveSelectionMessage
    | DiagramLayoutUpdateMessage;

export interface RequestRefreshMessage {
    type: 'request:refresh';
}

/** Client requests the server to persist ontology selection to memo.package.yaml */
export interface OntologySaveSelectionMessage {
    type: 'ontology:save-selection';
    payload: { selected: string[] };
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

// ─── Sidecar Layout ─────────────────────────────────────────────────────────

/** Per-node visual override stored in .memo/layouts/<diagramId>.yaml */
export interface DiagramNodeLayout {
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
}

/** Per-edge visual override */
export interface DiagramEdgeLayout {
    color?: string;
    strokeWidth?: number;
    labelVisible?: boolean;
    style?: 'solid' | 'dashed' | 'dotted';
}

/** Full layout for one diagram, deserialized from the YAML sidecar */
export interface DiagramLayout {
    nodes: Record<string, DiagramNodeLayout>;
    edges: Record<string, DiagramEdgeLayout>;
    canvas?: { zoom?: number; pan?: { x: number; y: number }; grid?: number; snap?: boolean };
}

/** Server → Client: initial layout data for all diagrams that have sidecars */
export interface DiagramLayoutMessage {
    type: 'diagram:layout';
    payload: { layouts: Record<string, DiagramLayout> };
}

/** Client → Server: save updated positions after user drags nodes */
export interface DiagramLayoutUpdateMessage {
    type: 'diagram:layout:update';
    payload: {
        diagramId: string;
        layout: DiagramLayout;
    };
}

/** Server → Client: CSV import results */
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
