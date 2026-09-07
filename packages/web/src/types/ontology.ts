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
    name: string;              // e.g. "@memoarchitect/ontology"
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
    /**
     * The `ExplorerClassification` usages the ontology declares — the
     * authoritative taxonomy for where a namespace's content belongs in the
     * Model Explorer. `layers` has these already applied for kinds the
     * ontology declares; these are needed for everything else, because the
     * native SysML constructs the builder synthesizes carry a NAMESPACE and no
     * kind entry. Architect must read the taxonomy rather than carry one.
     */
    explorerPlacements?: ExplorerPlacementInfo[];
    /** The `LayerRendering` usages the ontology declares — labels and colours. */
    layerPalette?: LayerPaletteInfo[];
}

export interface ExplorerPlacementInfo {
    sourceNamespace: string;   // e.g. "behavior"
    explorerDomain: string;    // e.g. "architecture"
    explorerGroup: string;     // e.g. "functional"
}

export interface LayerPaletteInfo {
    layerId: string;           // e.g. "operational"
    layerLabel: string;        // e.g. "Operational"
    layerColor: string;        // hex colour
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
    isAbstract?: boolean;
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
