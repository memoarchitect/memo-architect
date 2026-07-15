// ─── Ontology Package Types ────────────────────────────────────────────────────
//
// Shared types for ontology package management in the MEMO web app.
// These are populated from the ontology:packages WebSocket message sent by
// the CLI dev server (Issue #154).
// ─────────────────────────────────────────────────────────────────────────────

export interface OntologyRelationshipInfo {
    name: string;
    sourceKind?: string;    // first typed `end` in the connection def
    targetKind?: string;    // second typed `end` in the connection def
}

export interface OntologyPackageInfo {
    name: string;              // e.g. "@memo/ontology"
    version: string;           // e.g. "0.1.0"
    type: 'ontology' | 'profile' | 'extension' | 'methodology';
    description: string;
    extends?: string;          // parent package name
    layers: OntologyLayerInfo[];
    kindCount: number;
    relationshipCount: number;
    relationshipTypes: OntologyRelationshipInfo[];
    selected: boolean;         // true if in project's memo.package.yaml ontologies list
    rootDir?: string;          // absolute path to the package directory (set by dev server for Open-source deep-link)
}

export interface OntologyLayerInfo {
    id: string;                // e.g. "risk"
    label: string;             // e.g. "Risk"
    color: string;             // hex color, e.g. "#EF4444"
    kindCount: number;
    kinds: OntologyKindInfo[];
}

export interface OntologyKindInfo {
    name: string;              // e.g. "Hazard"
    label: string;             // e.g. "Hazard" (human-readable)
    construct: string;         // e.g. "part def"
    layer: string;             // parent layer id
    instanceCount: number;     // how many model elements use this kind
    viewpoints: string[];      // viewpoint ids that include this kind
    description?: string;      // from SysML doc comment
    derivesFrom?: string;      // supertype kind name
    derivedBy?: string[];      // kinds that specialize this one
    relationships?: Array<{ type: string; targetKind: string; direction: 'outgoing' | 'incoming' }>;
    group?: string;            // namespace sub-group: first directory under the layer (e.g. "risk")
    standard?: string;         // compliance standard (e.g. "iso14971") for kinds under compliance/<standard>/
}

export interface OntologySaveResult {
    success: boolean;
    orphanedElements?: OrphanedElement[];
}

export interface OrphanedElement {
    elementId: string;
    elementName: string;
    kind: string;              // the kind that belongs to a deselected ontology
    fromOntology: string;      // package name being deselected
}
