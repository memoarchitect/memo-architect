// ─── OWL/RDF Exporter ───────────────────────────────────────────────────────
//
// Converts a MEMOConfig ontology to OWL/RDF format (Turtle syntax).
// Shared by standalone ontology packages.
// ────────────────────────────────────────────────────────────────────────────

export interface OntologyConfig {
    projectName: string;
    cosmaLayers?: { id: string; label: string; color: string }[];
    kinds: Record<string, {
        label: string;
        layer?: string;
        sysmlConstruct: string;
        defaultAttributes?: Record<string, string>;
    }>;
    relationshipTypes: { name: string; label: string; layer: string; color: string }[];
    closureRules: {
        id: string;
        description: string;
        entity: string;
        rule: { type: string; relationship?: string; min?: number; max?: number; attribute?: string };
        severity: string;
    }[];
    viewpoints?: {
        id: string;
        label: string;
        visibleKinds: string[];
        visibleRelationships: string[];
        visibleLayers: string[];
    }[];
    ontologyMetadata?: {
        id: string;
        version: string;
        description: string;
        author?: string;
        license?: string;
    };
}

export function exportToOwlTurtle(
    config: OntologyConfig,
    namespace: string = 'https://sysand.dev/ontology/memo/core#'
): string {
    const lines: string[] = [];
    const prefix = 'memo';

    lines.push(`@prefix ${prefix}: <${namespace}> .`);
    lines.push('@prefix owl: <http://www.w3.org/2002/07/owl#> .');
    lines.push('@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .');
    lines.push('@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .');
    lines.push('@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .');
    lines.push('@prefix dcterms: <http://purl.org/dc/terms/> .');
    lines.push('');

    lines.push(`<${namespace.replace(/#$/, '')}> a owl:Ontology ;`);
    if (config.ontologyMetadata) {
        lines.push(`    dcterms:title "${escape(config.ontologyMetadata.description)}" ;`);
        lines.push(`    owl:versionInfo "${config.ontologyMetadata.version}" ;`);
        if (config.ontologyMetadata.author) {
            lines.push(`    dcterms:creator "${escape(config.ontologyMetadata.author)}" ;`);
        }
    } else {
        lines.push(`    dcterms:title "${escape(config.projectName)}" ;`);
    }
    lines.push('    .');
    lines.push('');

    lines.push(`${prefix}:layer a owl:AnnotationProperty .`);
    lines.push(`${prefix}:sysmlConstruct a owl:AnnotationProperty .`);
    lines.push(`${prefix}:color a owl:AnnotationProperty .`);
    lines.push(`${prefix}:severity a owl:AnnotationProperty .`);
    lines.push('');

    if (config.cosmaLayers && config.cosmaLayers.length > 0) {
        for (const layer of config.cosmaLayers) {
            lines.push(`${prefix}:Layer_${capitalize(layer.id)} a owl:Class ;`);
            lines.push(`    rdfs:label "${escape(layer.label)}" ;`);
            lines.push(`    ${prefix}:color "${layer.color}" ;`);
            lines.push(`    rdfs:comment "Layer: ${escape(layer.label)}" .`);
            lines.push('');
        }
    }

    for (const [kindName, kindDef] of Object.entries(config.kinds)) {
        lines.push(`${prefix}:${kindName} a owl:Class ;`);
        lines.push(`    rdfs:label "${escape(kindDef.label)}" ;`);
        if (kindDef.layer) {
            lines.push(`    rdfs:subClassOf ${prefix}:Layer_${capitalize(kindDef.layer)} ;`);
            lines.push(`    ${prefix}:layer "${kindDef.layer}" ;`);
        }
        lines.push(`    ${prefix}:sysmlConstruct "${kindDef.sysmlConstruct}" ;`);

        const kindRules = config.closureRules.filter(r => r.entity === kindName);
        for (const rule of kindRules) {
            if (rule.rule.type === 'requireRelationship' && rule.rule.relationship && rule.rule.min) {
                lines.push('    rdfs:subClassOf [');
                lines.push('        a owl:Restriction ;');
                lines.push(`        owl:onProperty ${prefix}:${rule.rule.relationship} ;`);
                lines.push(`        owl:minCardinality "${rule.rule.min}"^^xsd:nonNegativeInteger`);
                lines.push('    ] ;');
            }
        }

        lines.push('    .');
        lines.push('');
    }

    for (const rel of config.relationshipTypes) {
        lines.push(`${prefix}:${rel.name} a owl:ObjectProperty ;`);
        lines.push(`    rdfs:label "${escape(rel.label)}" ;`);
        lines.push(`    ${prefix}:layer "${rel.layer}" ;`);
        lines.push(`    ${prefix}:color "${rel.color}" .`);
        lines.push('');
    }

    return lines.join('\n');
}

export function exportToOwlXml(
    config: OntologyConfig,
    namespace: string = 'https://sysand.dev/ontology/memo/core#'
): string {
    const lines: string[] = [];
    const ns = namespace.replace(/#$/, '');

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"');
    lines.push('         xmlns:owl="http://www.w3.org/2002/07/owl#"');
    lines.push('         xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"');
    lines.push(`         xmlns:memo="${namespace}">`);
    lines.push('');
    lines.push(`  <owl:Ontology rdf:about="${ns}"/>`);
    lines.push('');

    if (config.cosmaLayers) {
        for (const layer of config.cosmaLayers) {
            lines.push(`  <owl:Class rdf:about="${namespace}Layer_${capitalize(layer.id)}">`);
            lines.push(`    <rdfs:label>${escapeXml(layer.label)}</rdfs:label>`);
            lines.push('  </owl:Class>');
        }
        lines.push('');
    }

    for (const [kindName, kindDef] of Object.entries(config.kinds)) {
        lines.push(`  <owl:Class rdf:about="${namespace}${kindName}">`);
        lines.push(`    <rdfs:label>${escapeXml(kindDef.label)}</rdfs:label>`);
        if (kindDef.layer) {
            lines.push(`    <rdfs:subClassOf rdf:resource="${namespace}Layer_${capitalize(kindDef.layer)}"/>`);
        }
        lines.push('  </owl:Class>');
    }
    lines.push('');

    for (const rel of config.relationshipTypes) {
        lines.push(`  <owl:ObjectProperty rdf:about="${namespace}${rel.name}">`);
        lines.push(`    <rdfs:label>${escapeXml(rel.label)}</rdfs:label>`);
        lines.push('  </owl:ObjectProperty>');
    }

    lines.push('');
    lines.push('</rdf:RDF>');

    return lines.join('\n');
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function escape(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
