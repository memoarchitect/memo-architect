// ─── Model Builder ────────────────────────────────────────────────────────────
//
// Walks Langium AST documents and produces a serializable MemoModel.
// Maps SysML usages → MemoElements and ConnectionUsages → MemoRelationships.
//
// Key design decisions:
//   - usage.type (e.g. "Hazard") is matched against config.kinds for layer info
//   - ConnectionUsage.type (e.g. "Mitigates") → lowercase → matches config.relationshipTypes
//   - PackageRegistry tracks cross-file packages and resolves imports
//   - Connections are deferred until all elements are extracted (two-pass)
//   - Doc comments are extracted from usage bodies
//
// Dual-mode resolution (M41):
//   - If KindRegistry is provided, it takes precedence over config.kinds
//   - If RelationshipRegistry is provided, it takes precedence for relationship validation
//   - Falls back to config when registries are not provided or entry not found
//   - Backward compatible: existing callers pass no registries, behavior unchanged
//
// Phase 5 additions:
//   - ActionDefinition bodies extract parameters (in/out/inout)
//   - ActionUsage supports composite actions with nested actions
//   - FlowConnectionUsage → MemoRelationship of type "flow" with flowItem
//   - SuccessionUsage → MemoRelationship pairs of type "succession"
//   - AllocateUsage → MemoRelationship of type "allocateTo"
//   - ItemDefinition → MemoElement with construct "item"
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
    ActionDefinition,
    ItemDefinition,
    PartDefinition,
    PortDefinition,
    InterfaceDefinition,
    ConnectionDefinition,
    ActionParameterMember,
    FlowConnectionUsage,
    SuccessionUsage,
    AllocateUsage,
} from '../language/generated/ast.js';
import type { MEMOConfig, KindDefinition } from './config.js';
import type {
    MemoElement,
    MemoRelationship,
    MemoModel,
    ParseError,
    ActionParameter,
    PortSpec,
} from './semantic.js';
import type { ParsedDocument } from './parser-utils.js';
import { PackageRegistry } from './package-registry.js';
import { assignSequentialShortIds } from './short-id.js';
import type { KindRegistry } from './kind-registry.js';
import type { RelationshipRegistry } from './relationship-registry.js';

/**
 * Optional registries for dual-mode resolution.
 * When provided, registries take precedence over config lookups.
 * Falls back to config when a registry entry is not found.
 */
export interface BuilderRegistries {
    /** KindRegistry populated from ontology SysML files */
    kindRegistry?: KindRegistry;
    /** RelationshipRegistry populated from ontology SysML files */
    relationshipRegistry?: RelationshipRegistry;
}

let relationshipCounter = 0;

/** Deferred connection to resolve after all elements are extracted */
interface DeferredConnection {
    conn: ConnectionUsage;
    filePath: string;
    packageName: string;
}

/** Deferred flow to resolve after all elements are extracted */
interface DeferredFlow {
    flow: FlowConnectionUsage;
    filePath: string;
    packageName: string;
    parentActionId?: string;
}

/** Deferred succession to resolve after all elements are extracted */
interface DeferredSuccession {
    succession: SuccessionUsage;
    filePath: string;
    packageName: string;
    parentActionId?: string;
}

/** Deferred allocate to resolve after all elements are extracted */
interface DeferredAllocate {
    allocate: AllocateUsage;
    filePath: string;
    packageName: string;
}

/**
 * A semantic *Link usage (a part typed by a SemanticLink subtype) whose two
 * reference-binding members carry the source/target ends. Deferred so all
 * referenced elements are known before the edge is projected.
 */
interface DeferredLink {
    /** Element id of the link usage itself */
    linkId: string;
    /** Resolved link kind, e.g. "SatisfiedBy" */
    linkKind: string;
    /** Bound reference ends in document order (first = source, second = target) */
    ends: Array<{ role: string; ref: string }>;
    /** Attributes on the link (e.g. riskRole) used for role-based relation typing */
    attributes: Record<string, string>;
    filePath: string;
}

/** Forward + optional inverse navigation names for a projected link edge. */
interface LinkRelation {
    /** Forward relationship type (source → target) */
    type: string;
    /** Optional inverse navigation name (reachable from the target end) */
    inverse?: string;
    /** Attribute carrying a role that may override the type (e.g. "riskRole") */
    roleAttr?: string;
    /** Role value → relationship type overrides */
    roleMap?: Record<string, string>;
}

/**
 * Projection of each semantic *Link def (memo::core::relationships) onto a
 * navigable relationship type. Relationship names match the vocabulary the
 * native KerML rule packs navigate (traceTo, satisfies, verifies, …). Source is
 * the link's first reference member, target the second (per the def's member
 * order). Where a rule navigates the same link from both ends under different
 * names, an `inverse` alias makes the single edge reachable both ways.
 */
const LINK_RELATION_MAP: Record<string, LinkRelation> = {
    DerivesFrom: { type: 'traceTo' },
    SatisfiedBy: { type: 'satisfiedBy', inverse: 'satisfies' },
    HazardMitigationLink: { type: 'mitigatedBy', inverse: 'mitigates' },
    FunctionAllocationLink: { type: 'allocatedTo' },
    InterfaceRealizationLink: { type: 'realizedBy' },
    VerificationLink: { type: 'verifiedBy', inverse: 'verifies' },
    EvidenceProductionLink: { type: 'produces' },
    DocumentInclusionLink: { type: 'includedIn' },
    RiskTraceLink: { type: 'traceTo', roleAttr: 'riskRole', roleMap: { assessedAgainst: 'assessedAgainst' } },
    ExecutionOrderLink: { type: 'precedes' },
    MethodologyBindingLink: { type: 'resolvesTo' },
    AssetThreatLink: { type: 'threatenedBy', inverse: 'exposes' },
    ThreatVulnerabilityLink: { type: 'exploits' },
    ThreatScenarioLink: { type: 'realizedBy' },
    VulnerabilityMitigationLink: { type: 'mitigatedBy' },
    // A security requirement derived from a threat is that threat's mitigation
    // (FDA cybersecurity guidance), so the threat is navigable as mitigatedBy.
    CyberRequirementDerivationLink: { type: 'mitigatedBy', inverse: 'mitigates' },
    CyberSafetyTraceLink: { type: 'impactsSafety' },
    TrustBoundaryCrossingLink: { type: 'crosses' },
    // JJ-1: P1 regulatory verb relations.
    DerivesInto: { type: 'derivesInto', inverse: 'derivedFrom' },
    DeploysOnto: { type: 'deployedOnto', inverse: 'hosts' },
    Validates: { type: 'validatedBy', inverse: 'validates' },
    // JJ-4: SOUP dependency (IEC 62304 §8.1.2).
    DependsOnSoup: { type: 'dependsOnSoup', inverse: 'soupConsumedBy' },
    // JJ-5: Operational Analysis layer (ARCADIA OA).
    Performs: { type: 'performs', inverse: 'performedBy' },
    ContributesToCapability: { type: 'contributesToCapability', inverse: 'capabilityInvolves' },
    SequencesStep: { type: 'sequencesStep', inverse: 'precededInScenarioBy' },
    DerivesSystemNeed: { type: 'derivesSystemNeed', inverse: 'systemNeedDerivedFrom' },
    // JJ-6: System Need / Functional analysis layer (ARCADIA SA).
    RealizesCapability: { type: 'realizesCapability', inverse: 'capabilityRealizedBy' },
    InvolvesFunction: { type: 'involvesFunction', inverse: 'functionInvolvedIn' },
    RealizesScenario: { type: 'realizesScenario', inverse: 'scenarioRealizedBy' },
    // JJ-7: Physical Architecture layer.
    HostedBy: { type: 'hostedBy', inverse: 'hostsNode' },
    RealizesComponentExchange: { type: 'realizesComponentExchange', inverse: 'componentExchangeRealizedBy' },
    // JJ-8: FMEA package.
    HasFailureMode: { type: 'hasFailureMode', inverse: 'failureModeOf' },
    CausesEffect: { type: 'causesEffect', inverse: 'effectOf' },
    CausedBy: { type: 'causedBy', inverse: 'causes' },
    DetectedBy: { type: 'detectedBy', inverse: 'detects' },
    AddressedByAction: { type: 'addressedByAction', inverse: 'actionAddresses' },
    // JJ-9: FTA package.
    InputToGate: { type: 'inputToGate', inverse: 'gateHasInput' },
    ProducesEvent: { type: 'producesEvent', inverse: 'eventProducedBy' },
    OriginatesFrom: { type: 'originatesFrom', inverse: 'originatesEvent' },
    ContainsEvent: { type: 'containsEvent', inverse: 'eventInCutSet' },
    // JJ-10: DesignDecision.
    Decides: { type: 'decides', inverse: 'decidedBy' },
    // JJ-12: Composition + exchange allocation.
    Composes: { type: 'composes', inverse: 'composedBy' },
    AllocatesExchange: { type: 'allocatesExchangeTo', inverse: 'exchangeAllocatedFrom' },
    // JJ-16: HAZOP + cross-cutting analysis↔ISO 14971 links.
    ContributesToHazard: { type: 'contributesToHazard', inverse: 'hazardContributedBy' },
    LeadsToHazard: { type: 'leadsToHazard', inverse: 'hazardLedToBy' },
    IdentifiesHazard: { type: 'identifiesHazard', inverse: 'hazardIdentifiedBy' },
    AnalyzedBy: { type: 'analyzedBy', inverse: 'analyzes' },
    MitigatedByControl: { type: 'mitigatedByControl', inverse: 'controlMitigatesFailure' },
    BrokenByControl: { type: 'brokenByControl', inverse: 'controlBreaksCutSet' },
    // JJ-17: Change management (ISO 13485 §7.3.9).
    Changes: { type: 'changes', inverse: 'changedBy' },
    // JJ-18: Usability testing (IEC 62366-1).
    TestedByUsability: { type: 'testedByUsability', inverse: 'usabilityTests' },
    // JJ-19: Post-market feedback (MDR Art. 83–86).
    FeedsBackTo: { type: 'feedsBackTo', inverse: 'receivesFeedback' },
    // JJ-20: Port→interface binding (M9).
    BindsToInterface: { type: 'bindsToInterface', inverse: 'interfaceBoundBy' },
};

/**
 * Resolve a kind definition using registry-first, config-fallback strategy.
 * Returns the KindDefinition and the resolved kind name.
 */
function resolveKindDef(
    typeName: string,
    config: MEMOConfig,
    registries?: BuilderRegistries
): { kindDef: KindDefinition | undefined; resolvedKind: string } {
    // Try registry first
    if (registries?.kindRegistry) {
        const entry = registries.kindRegistry.getKind(typeName);
        if (entry) {
            return {
                kindDef: { label: entry.label, layer: entry.layer, sysmlConstruct: entry.sysmlConstruct },
                resolvedKind: typeName,
            };
        }
        // Try local part of qualified name
        if (typeName.includes('::')) {
            const localType = typeName.split('::').pop()!;
            const localEntry = registries.kindRegistry.getKind(localType);
            if (localEntry) {
                return {
                    kindDef: { label: localEntry.label, layer: localEntry.layer, sysmlConstruct: localEntry.sysmlConstruct },
                    resolvedKind: localType,
                };
            }
        }
    }

    // Fall back to config (if kinds are present)
    const kinds = config.kinds ?? {};
    const kindDef = kinds[typeName];
    if (kindDef) {
        return { kindDef, resolvedKind: typeName };
    }

    // Try local part of qualified name in config
    if (typeName.includes('::')) {
        const localType = typeName.split('::').pop()!;
        if (kinds[localType]) {
            return { kindDef: kinds[localType], resolvedKind: localType };
        }
    }

    return { kindDef: undefined, resolvedKind: typeName };
}

/**
 * Build a MemoModel from parsed documents and config.
 * Optionally accepts registries for dual-mode resolution (registry-first, config-fallback).
 */
export function buildMemoModel(
    documents: ParsedDocument[],
    config: MEMOConfig,
    parseErrors: ParseError[] = [],
    registries?: BuilderRegistries
): MemoModel {
    relationshipCounter = 0;
    const elements = new Map<string, MemoElement>();
    const relationships: MemoRelationship[] = [];
    const errors: ParseError[] = [...parseErrors];
    const deferredConnections: DeferredConnection[] = [];
    const deferredFlows: DeferredFlow[] = [];
    const deferredSuccessions: DeferredSuccession[] = [];
    const deferredAllocates: DeferredAllocate[] = [];
    const deferredLinks: DeferredLink[] = [];

    // Phase 1: Build package registry from all documents
    const registry = new PackageRegistry();
    registry.buildFromDocuments(documents);

    // Phase 2: Extract elements from all documents (populates registry)
    for (const { document, filePath } of documents) {
        const model = document.parseResult.value;
        extractFromModel(model, filePath, config, elements, deferredConnections, deferredFlows, deferredSuccessions, deferredAllocates, deferredLinks, errors, registry, registries);
    }

    // Phase 3: Resolve connections using the registry (all elements now known)
    const allElementIds = new Set(elements.keys());
    for (const { conn, filePath, packageName } of deferredConnections) {
        resolveConnection(conn, filePath, packageName, config, elements, relationships, registry, allElementIds);
    }

    // Phase 3b: Resolve flow connections
    for (const { flow, filePath, packageName, parentActionId } of deferredFlows) {
        resolveFlowConnection(flow, filePath, packageName, parentActionId, relationships, allElementIds);
    }

    // Phase 3c: Resolve successions
    for (const { succession, filePath, packageName, parentActionId } of deferredSuccessions) {
        resolveSuccession(succession, filePath, packageName, parentActionId, relationships, allElementIds);
    }

    // Phase 3d: Resolve allocations
    for (const { allocate, filePath, packageName } of deferredAllocates) {
        resolveAllocate(allocate, filePath, packageName, elements, relationships, registry, allElementIds);
    }

    // Phase 3e: Project semantic *Link usages into navigable relationships
    for (const link of deferredLinks) {
        resolveLink(link, elements, relationships);
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

    // Assign sequential short IDs: sort each kind group by element id, then
    // assign PREFIX-1, PREFIX-2, ... Deletion-stable (survivors keep their seq).
    for (const [kind, kindElements] of elementsByKind) {
        const idToShortId = assignSequentialShortIds(kind, kindElements.map(e => e.id));
        for (const el of kindElements) {
            (el as MemoElement).shortId = idToShortId.get(el.id);
        }
    }

    // Phase 4: Validate relationship end types (warnings only)
    if (registries?.relationshipRegistry) {
        for (const rel of relationships) {
            const regEntry = registries.relationshipRegistry.getRelType(rel.type);
            if (!regEntry || regEntry.ends.length === 0) continue;

            const sourceEl = elements.get(rel.sourceId);
            const targetEl = elements.get(rel.targetId);

            // Check if the source/target kinds match the typed ends
            for (const end of regEntry.ends) {
                if (!end.type) continue; // untyped ends allow any kind

                // Match end to source or target by position (first end = source, second = target)
                const endIndex = regEntry.ends.indexOf(end);
                const el = endIndex === 0 ? sourceEl : targetEl;
                if (!el) continue;

                // Check if element kind matches the expected type
                if (el.kind !== end.type && !el.kind.endsWith(end.type)) {
                    errors.push({
                        message: `[well-formedness] Relationship "${rel.type}" expects ${end.name} to be ${end.type}, but found ${el.kind}`,
                        file: rel.file ?? '',
                    });
                }
            }
        }
    }

    const relationshipsByType = new Map<string, MemoRelationship[]>();
    const outgoing = new Map<string, MemoRelationship[]>();
    const incoming = new Map<string, MemoRelationship[]>();
    for (const rel of relationships) {
        if (!relationshipsByType.has(rel.type)) relationshipsByType.set(rel.type, []);
        relationshipsByType.get(rel.type)!.push(rel);
        // Inverse navigation name (e.g. "satisfies" for a "satisfiedBy" edge) is a
        // navigable segment too, so register it as a known relationship type.
        if (rel.inverseType) {
            if (!relationshipsByType.has(rel.inverseType)) relationshipsByType.set(rel.inverseType, []);
            relationshipsByType.get(rel.inverseType)!.push(rel);
        }
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
    deferredConnections: DeferredConnection[],
    deferredFlows: DeferredFlow[],
    deferredSuccessions: DeferredSuccession[],
    deferredAllocates: DeferredAllocate[],
    deferredLinks: DeferredLink[],
    errors: ParseError[],
    registry: PackageRegistry,
    registries?: BuilderRegistries
): void {
    for (const member of model.members) {
        if (member.$type === 'PackageDeclaration') {
            extractFromPackage(member as PackageDeclaration, filePath, '', config, elements, deferredConnections, deferredFlows, deferredSuccessions, deferredAllocates, deferredLinks, errors, registry, registries);
        }
    }
}

function extractFromPackage(
    pkg: PackageDeclaration,
    filePath: string,
    parentPackage: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    deferredConnections: DeferredConnection[],
    deferredFlows: DeferredFlow[],
    deferredSuccessions: DeferredSuccession[],
    deferredAllocates: DeferredAllocate[],
    deferredLinks: DeferredLink[],
    errors: ParseError[],
    registry: PackageRegistry,
    registries?: BuilderRegistries
): void {
    const packageName = parentPackage ? `${parentPackage}::${pkg.name}` : pkg.name;

    for (const member of pkg.members) {
        switch (member.$type) {
            case 'PackageDeclaration':
                extractFromPackage(member as PackageDeclaration, filePath, packageName, config, elements, deferredConnections, deferredFlows, deferredSuccessions, deferredAllocates, deferredLinks, errors, registry, registries);
                break;
            case 'PartUsage':
                extractUsage(member as PartUsage, 'part', filePath, packageName, config, elements, registry, registries, deferredLinks);
                break;
            case 'RequirementUsage':
                extractUsage(member as RequirementUsage, 'requirement', filePath, packageName, config, elements, registry, registries);
                break;
            case 'ActionUsage':
                extractActionUsage(member as ActionUsage, filePath, packageName, config, elements, deferredFlows, deferredSuccessions, registry, registries);
                break;
            case 'PortUsage':
                extractUsage(member as PortUsage, 'port', filePath, packageName, config, elements, registry, registries);
                break;
            case 'ConnectionUsage':
                // Defer connection resolution until all elements are extracted
                deferredConnections.push({
                    conn: member as ConnectionUsage,
                    filePath,
                    packageName,
                });
                break;
            case 'AllocateUsage':
                deferredAllocates.push({
                    allocate: member as AllocateUsage,
                    filePath,
                    packageName,
                });
                break;
            // ─── Definition members ─────────────────────────────────────
            case 'ActionDefinition':
                extractActionDefinition(member as ActionDefinition, filePath, packageName, config, elements, registry);
                break;
            case 'ItemDefinition':
                extractItemDefinition(member as ItemDefinition, filePath, packageName, config, elements, registry);
                break;
            case 'PartDefinition':
            case 'PortDefinition':
            case 'InterfaceDefinition':
            case 'ConnectionDefinition':
                extractDefinitionPorts(member as PartDefinition | PortDefinition | InterfaceDefinition | ConnectionDefinition, filePath, packageName, config, elements, registry, registries);
                break;
            // Other definitions (viewpoint def, view def, etc.) inside packages are
            // ontology-level — we don't extract them as model elements in device projects
        }
    }
}

type UsageNode = PartUsage | RequirementUsage | ActionUsage | PortUsage;

function extractUsage(
    usage: UsageNode,
    construct: string,
    filePath: string,
    packageName: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    registry: PackageRegistry,
    registries?: BuilderRegistries,
    deferredLinks?: DeferredLink[]
): void {
    const id = usage.name;
    const typeName = usage.type; // e.g. "Hazard", "Requirement"

    // Dual-mode resolution: registry first, then config fallback
    const { kindDef: finalKindDef, resolvedKind } = typeName
        ? resolveKindDef(typeName, config, registries)
        : { kindDef: undefined, resolvedKind: 'Unknown' };

    const attributes = extractAttributes(usage.body);
    const doc = extractDocComment(usage.body);

    // Human-readable name: prefer "attribute redefines name" over usage name
    const displayName = attributes['name'] || attributes['title'] || id;

    const element: MemoElement = {
        id,
        name: displayName,
        kind: resolvedKind,
        construct,
        layer: finalKindDef?.layer || 'unknown',
        file: filePath,
        package: packageName || undefined,
        attributes,
        doc,
    };

    // Port-specific fields
    if (construct === 'port') {
        const portNode = usage as PortUsage;
        element.portSpec = {
            type: portNode.type,
            direction: portNode.direction as PortSpec['direction'],
            isConjugated: portNode.isConjugated ?? false,
        };
    }

    elements.set(id, element);
    registry.registerElement(id, packageName);

    // Defer semantic *Link projection: a part typed by a SemanticLink subtype
    // carries its source/target ends as reference-binding part members.
    if (deferredLinks && LINK_RELATION_MAP[resolvedKind]) {
        const ends = extractPartBindings(usage.body);
        if (ends.length >= 2) {
            deferredLinks.push({ linkId: id, linkKind: resolvedKind, ends, attributes, filePath });
        }
    }
}

/**
 * Extract reference-binding part members (`part role = ref;` / `part role :> ref;`)
 * from a usage body, in document order. These carry the ends of a semantic *Link.
 */
function extractPartBindings(body: any[] | undefined): Array<{ role: string; ref: string }> {
    if (!body) return [];
    const ends: Array<{ role: string; ref: string }> = [];
    for (const member of body) {
        if (member.$type === 'PartMember' && member.boundRef) {
            ends.push({ role: member.name, ref: member.boundRef });
        }
    }
    return ends;
}

/**
 * Project a deferred semantic *Link into a navigable MemoRelationship. The first
 * bound end is the source, the second the target; the relationship type comes
 * from LINK_RELATION_MAP (optionally overridden by a role attribute). Skips the
 * link when either referenced element is unknown.
 */
function resolveLink(
    link: DeferredLink,
    elements: Map<string, MemoElement>,
    relationships: MemoRelationship[]
): void {
    const mapping = LINK_RELATION_MAP[link.linkKind];
    if (!mapping) return;

    const [src, tgt] = link.ends;
    // Reference may be qualified (a::b::c); the element id is the last segment.
    const sourceId = src.ref.split('::').pop()!;
    const targetId = tgt.ref.split('::').pop()!;
    if (!elements.has(sourceId) || !elements.has(targetId)) return;

    // Role attribute (e.g. riskRole) can refine the relationship type.
    let type = mapping.type;
    if (mapping.roleAttr && mapping.roleMap) {
        const roleVal = link.attributes[mapping.roleAttr];
        if (roleVal && mapping.roleMap[roleVal]) type = mapping.roleMap[roleVal];
    }

    // The constraint evaluator lowercases navigation segments before matching, so
    // relationship type names are stored lowercased (matching the connection path).
    relationships.push({
        id: `rel-${++relationshipCounter}`,
        type: type.toLowerCase(),
        inverseType: mapping.inverse?.toLowerCase(),
        sourceId,
        sourceEnd: src.role,
        targetId,
        targetEnd: tgt.role,
        file: link.filePath,
    });
}

/**
 * Extract an ActionDefinition as a MemoElement with parameters.
 */
function extractActionDefinition(
    actionDef: ActionDefinition,
    filePath: string,
    packageName: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    registry: PackageRegistry
): void {
    const id = actionDef.name;

    // Extract parameters from body
    const parameters: ActionParameter[] = [];
    const bodyMembers = actionDef.body || [];
    for (const member of bodyMembers) {
        if (member.$type === 'ActionParameterMember') {
            const param = member as ActionParameterMember;
            parameters.push({
                name: param.name,
                direction: param.direction as ActionParameter['direction'],
                type: param.type,
            });
        }
    }

    const attributes = extractAttributes(bodyMembers);
    const doc = extractDocComment(bodyMembers);

    const element: MemoElement = {
        id,
        name: id,
        kind: 'ActionDefinition',
        construct: 'action',
        layer: 'behavior',
        file: filePath,
        package: packageName || undefined,
        attributes,
        doc,
        parameters: parameters.length > 0 ? parameters : undefined,
    };

    elements.set(id, element);
    registry.registerElement(id, packageName);
}

/**
 * Extract an ItemDefinition as a MemoElement.
 */
function extractItemDefinition(
    itemDef: ItemDefinition,
    filePath: string,
    packageName: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    registry: PackageRegistry
): void {
    const id = itemDef.name;

    const attributes = extractAttributes(itemDef.body);
    const doc = extractDocComment(itemDef.body);

    const element: MemoElement = {
        id,
        name: id,
        kind: 'ItemDefinition',
        construct: 'item',
        layer: 'behavior',
        file: filePath,
        package: packageName || undefined,
        attributes,
        doc,
    };

    elements.set(id, element);
    registry.registerElement(id, packageName);
}

/**
 * Walk a definition body to extract port usages as owned port elements.
 * Sets owner on ports and ownedPorts on the definition.
 */
function extractDefinitionPorts(
    def: PartDefinition | PortDefinition | InterfaceDefinition | ConnectionDefinition,
    filePath: string,
    packageName: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    registry: PackageRegistry,
    registries?: BuilderRegistries
): void {
    const ownerId = def.name;
    const body = def.body || [];
    const ownedPortIds: string[] = [];

    for (const member of body) {
        if (member.$type === 'PortUsage') {
            const portUsage = member as PortUsage;
            extractUsage(portUsage, 'port', filePath, packageName, config, elements, registry, registries);
            const portEl = elements.get(portUsage.name);
            if (portEl) {
                portEl.owner = ownerId;
                ownedPortIds.push(portUsage.name);
            }
        }
    }

    if (ownedPortIds.length > 0) {
        const ownerEl = elements.get(ownerId);
        if (ownerEl) {
            ownerEl.ownedPorts = ownedPortIds;
        }
    }
}

/**
 * Extract an ActionUsage, including nested actions, flows, and successions.
 * Supports both typed (action name : Type;) and composite (action name { ... }) forms.
 */
function extractActionUsage(
    usage: ActionUsage,
    filePath: string,
    packageName: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    deferredFlows: DeferredFlow[],
    deferredSuccessions: DeferredSuccession[],
    registry: PackageRegistry,
    registries?: BuilderRegistries,
    parentActionId?: string
): void {
    const id = usage.name;
    const typeName = usage.type;

    // Dual-mode resolution: registry first, then config fallback
    let kind = 'ActionUsage';
    let layer = 'behavior';
    if (typeName) {
        const { kindDef, resolvedKind } = resolveKindDef(typeName, config, registries);
        if (kindDef) {
            kind = resolvedKind;
            layer = kindDef.layer || 'behavior';
        }
    }

    const bodyMembers = usage.body || [];
    const attributes = extractAttributes(bodyMembers);
    const doc = extractDocComment(bodyMembers);
    const displayName = attributes['name'] || attributes['title'] || id;

    // Store the action definition type for flow type checking
    if (typeName) {
        attributes['actionType'] = typeName;
    }

    const element: MemoElement = {
        id,
        name: displayName,
        kind,
        construct: 'action',
        layer,
        file: filePath,
        package: packageName || undefined,
        attributes,
        doc,
        parentAction: parentActionId,
    };

    elements.set(id, element);
    registry.registerElement(id, packageName);

    // Walk body for nested behavior members
    for (const member of bodyMembers) {
        switch (member.$type) {
            case 'ActionUsage':
                // Nested action usage — recursive extraction
                extractActionUsage(
                    member as ActionUsage, filePath, packageName, config,
                    elements, deferredFlows, deferredSuccessions, registry, registries, id
                );
                break;
            case 'FlowConnectionUsage':
                deferredFlows.push({
                    flow: member as FlowConnectionUsage,
                    filePath,
                    packageName,
                    parentActionId: id,
                });
                break;
            case 'SuccessionUsage':
                deferredSuccessions.push({
                    succession: member as SuccessionUsage,
                    filePath,
                    packageName,
                    parentActionId: id,
                });
                break;
        }
    }
}

function resolveConnection(
    conn: ConnectionUsage,
    filePath: string,
    packageName: string,
    config: MEMOConfig,
    elements: Map<string, MemoElement>,
    relationships: MemoRelationship[],
    registry: PackageRegistry,
    allElementIds: Set<string>
): void {
    const typeName = conn.type; // e.g. "Mitigates", "TraceTo"
    if (!typeName) return;
    if (!conn.source || !conn.target) return;

    // Normalize: "Mitigates" → "mitigates", "TraceTo" → "traceTo"
    const normalizedType = normalizeRelType(typeName);

    // Resolve source and target using registry for cross-file resolution
    const sourceId = registry.resolveElementId(conn.source.ref, packageName, allElementIds)
        || resolveRef(conn.source.ref);
    const targetId = registry.resolveElementId(conn.target.ref, packageName, allElementIds)
        || resolveRef(conn.target.ref);
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

    // Tag port IDs when endpoints reference port elements
    const sourceEl = elements.get(sourceId);
    if (sourceEl?.construct === 'port') {
        rel.sourcePortId = sourceId;
    }
    const targetEl = elements.get(targetId);
    if (targetEl?.construct === 'port') {
        rel.targetPortId = targetId;
    }

    relationships.push(rel);
}

/**
 * Resolve a flow connection usage into a MemoRelationship.
 * Flow endpoints use dot notation: "actionName.paramName"
 */
function resolveFlowConnection(
    flow: FlowConnectionUsage,
    filePath: string,
    packageName: string,
    parentActionId: string | undefined,
    relationships: MemoRelationship[],
    allElementIds: Set<string>
): void {
    const sourceRef = flow.source?.ref;
    const targetRef = flow.target?.ref;
    if (!sourceRef || !targetRef) return;

    // Parse dot notation: "receive.prescription" → actionId="receive", port="prescription"
    const sourceParts = sourceRef.split('.');
    const targetParts = targetRef.split('.');

    const sourceActionId = sourceParts[0];
    const sourcePort = sourceParts.length > 1 ? sourceParts.slice(1).join('.') : '';
    const targetActionId = targetParts[0];
    const targetPort = targetParts.length > 1 ? targetParts.slice(1).join('.') : '';

    // Only create relationship if both endpoints reference known elements
    if (!allElementIds.has(sourceActionId) || !allElementIds.has(targetActionId)) return;

    const rel: MemoRelationship = {
        id: `rel-${++relationshipCounter}`,
        type: 'flow',
        sourceId: sourceActionId,
        sourceEnd: sourcePort,
        targetId: targetActionId,
        targetEnd: targetPort,
        file: filePath,
        flowItem: flow.itemType || undefined,
    };

    relationships.push(rel);
}

/**
 * Resolve a succession usage into pairs of MemoRelationships.
 * "first start then A then B then done" → (start→A), (A→B), (B→done)
 */
function resolveSuccession(
    succession: SuccessionUsage,
    filePath: string,
    packageName: string,
    parentActionId: string | undefined,
    relationships: MemoRelationship[],
    allElementIds: Set<string>
): void {
    const steps = succession.steps || [];
    if (steps.length < 2) return;

    for (let i = 0; i < steps.length - 1; i++) {
        const fromRef = steps[i].ref;
        const toRef = steps[i + 1].ref;

        // "start" and "done" are pseudo-elements; use parent action as context
        const sourceId = fromRef === 'start'
            ? (parentActionId ? `${parentActionId}__start` : '__start')
            : fromRef;
        const targetId = toRef === 'done'
            ? (parentActionId ? `${parentActionId}__done` : '__done')
            : toRef;

        // Skip if neither endpoint is a known element (allow start/done pseudo-elements)
        const sourceKnown = fromRef === 'start' || allElementIds.has(sourceId);
        const targetKnown = toRef === 'done' || allElementIds.has(targetId);
        if (!sourceKnown || !targetKnown) continue;

        const rel: MemoRelationship = {
            id: `rel-${++relationshipCounter}`,
            type: 'succession',
            sourceId,
            sourceEnd: '',
            targetId,
            targetEnd: '',
            file: filePath,
        };

        relationships.push(rel);
    }
}

/**
 * Resolve an allocate usage into a MemoRelationship and set allocatedTo on the element.
 */
function resolveAllocate(
    allocate: AllocateUsage,
    filePath: string,
    packageName: string,
    elements: Map<string, MemoElement>,
    relationships: MemoRelationship[],
    registry: PackageRegistry,
    allElementIds: Set<string>
): void {
    const sourceRef = allocate.source;
    const targetRef = allocate.target;
    if (!sourceRef || !targetRef) return;

    // Resolve references
    const sourceId = registry.resolveElementId(sourceRef, packageName, allElementIds)
        || resolveRef(sourceRef);
    const targetId = registry.resolveElementId(targetRef, packageName, allElementIds)
        || resolveRef(targetRef);
    if (!sourceId || !targetId) return;

    // Set allocatedTo on the source element
    const sourceEl = elements.get(sourceId);
    if (sourceEl) {
        sourceEl.allocatedTo = targetId;
    }

    const rel: MemoRelationship = {
        id: `rel-${++relationshipCounter}`,
        type: 'allocateTo',
        sourceId,
        sourceEnd: 'action',
        targetId,
        targetEnd: 'part',
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
        case 'RealValue':
            return String((value as { value: string }).value);
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
