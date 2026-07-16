// ─── Functional ↔ Logical Consistency Analysis ─────────────────────────────
//
// Checks allocation consistency between functional and logical layers.
// Identifies unallocated functions, underutilized components, and
// cross-component flows that imply interface needs.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO, MemoElement, MemoRelationship } from '@memo/tools/browser';

const FUNCTIONAL_KINDS = new Set(['Function', 'Function', 'UserActivity']);
const STRUCTURAL_KINDS = new Set([
    'System', 'Subsystem', 'Component', 'LogicalComponent',
    'SoftwareComponent', 'SoftwareModule', 'Software',
]);

export interface ConsistencyIssue {
    id: string;
    type: 'unallocated-function' | 'no-functions-allocated' | 'cross-component-flow';
    severity: 'warning' | 'info';
    elementId: string;
    elementName: string;
    message: string;
    /** Related element IDs (e.g., both ends of a cross-component flow) */
    relatedIds?: string[];
}

export interface ConsistencyResult {
    /** Functions with their allocation targets */
    allocations: { functionId: string; functionName: string; targetId: string; targetName: string }[];
    /** Structural elements and the functions allocated to them */
    componentFunctions: Map<string, string[]>;
    /** Issues found */
    issues: ConsistencyIssue[];
    /** Functions in the model */
    functions: MemoElement[];
    /** Structural elements in the model */
    structures: MemoElement[];
}

export function analyzeConsistency(model: MemoModelDTO): ConsistencyResult {
    const functions: MemoElement[] = [];
    const structures: MemoElement[] = [];

    for (const el of Object.values(model.elements)) {
        if (FUNCTIONAL_KINDS.has(el.kind)) functions.push(el);
        if (STRUCTURAL_KINDS.has(el.kind)) structures.push(el);
    }

    // Build allocation map: function → structure
    const allocations: ConsistencyResult['allocations'] = [];
    const allocatedFunctions = new Set<string>();
    const componentFunctions = new Map<string, string[]>();

    for (const structEl of structures) {
        componentFunctions.set(structEl.id, []);
    }

    for (const rel of model.relationships) {
        if (rel.type !== 'allocateTo') continue;

        const func = model.elements[rel.sourceId];
        const struct = model.elements[rel.targetId];
        if (!func || !struct) continue;

        if (FUNCTIONAL_KINDS.has(func.kind) && STRUCTURAL_KINDS.has(struct.kind)) {
            allocations.push({
                functionId: func.id,
                functionName: func.name,
                targetId: struct.id,
                targetName: struct.name,
            });
            allocatedFunctions.add(func.id);
            if (!componentFunctions.has(struct.id)) {
                componentFunctions.set(struct.id, []);
            }
            componentFunctions.get(struct.id)!.push(func.id);
        }
    }

    // Also check allocatedTo attribute on elements
    for (const func of functions) {
        if (func.allocatedTo && !allocatedFunctions.has(func.id)) {
            // Find the structure by name
            const struct = structures.find(s => s.name === func.allocatedTo || s.id === func.allocatedTo);
            if (struct) {
                allocations.push({
                    functionId: func.id,
                    functionName: func.name,
                    targetId: struct.id,
                    targetName: struct.name,
                });
                allocatedFunctions.add(func.id);
                if (!componentFunctions.has(struct.id)) {
                    componentFunctions.set(struct.id, []);
                }
                componentFunctions.get(struct.id)!.push(func.id);
            }
        }
    }

    // Find issues
    const issues: ConsistencyIssue[] = [];
    let issueIdx = 0;

    // Unallocated functions
    for (const func of functions) {
        if (!allocatedFunctions.has(func.id)) {
            issues.push({
                id: `ci-${issueIdx++}`,
                type: 'unallocated-function',
                severity: 'warning',
                elementId: func.id,
                elementName: func.name,
                message: `Function "${func.name}" is not allocated to any component`,
            });
        }
    }

    // Components with no functions
    for (const struct of structures) {
        const funcs = componentFunctions.get(struct.id);
        if (!funcs || funcs.length === 0) {
            issues.push({
                id: `ci-${issueIdx++}`,
                type: 'no-functions-allocated',
                severity: 'info',
                elementId: struct.id,
                elementName: struct.name,
                message: `Component "${struct.name}" has no functions allocated to it`,
            });
        }
    }

    // Cross-component flows (functional flows between functions allocated to different components)
    const funcToComponent = new Map<string, string>();
    for (const alloc of allocations) {
        funcToComponent.set(alloc.functionId, alloc.targetId);
    }

    for (const rel of model.relationships) {
        if (rel.type !== 'flow') continue;
        const srcComp = funcToComponent.get(rel.sourceId);
        const tgtComp = funcToComponent.get(rel.targetId);
        if (srcComp && tgtComp && srcComp !== tgtComp) {
            const srcFunc = model.elements[rel.sourceId];
            const tgtFunc = model.elements[rel.targetId];
            if (srcFunc && tgtFunc) {
                issues.push({
                    id: `ci-${issueIdx++}`,
                    type: 'cross-component-flow',
                    severity: 'info',
                    elementId: rel.sourceId,
                    elementName: srcFunc.name,
                    message: `Flow from "${srcFunc.name}" to "${tgtFunc.name}" crosses component boundary (${model.elements[srcComp]?.name} → ${model.elements[tgtComp]?.name})`,
                    relatedIds: [rel.targetId, srcComp, tgtComp],
                });
            }
        }
    }

    return { allocations, componentFunctions, issues, functions, structures };
}
