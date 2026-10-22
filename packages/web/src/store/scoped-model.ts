// The model as the chosen workspace and the explorer's domain show it (plan A1). Pages that list or
// count the model read this; code that writes, or looks one element up to edit it, keeps reading the
// whole model.

import { useMemo } from 'react';
import type { MemoModelDTO, ValidationResult } from '@memoarchitect/tools/browser';
import { computeExplorerGroupTree, explorerDomainIds } from '../components/ExplorerPanel';
import type { OntologyPackageInfo } from '../types/ontology';
import { scopeModel, validationForWorkspace } from '../lib/workspace-scope';
import { useModelStore } from './model-store';

/** The model as the chosen workspace shows it, whatever domain the explorer is on. */
export function useWorkspaceModel(): MemoModelDTO | null {
    const model = useModelStore(s => s.model);
    const workspace = useModelStore(s => s.workspace);
    return useMemo(() => (model ? scopeModel(model, workspace) : null), [model, workspace]);
}

const domainCache = new WeakMap<MemoModelDTO, Map<string, MemoModelDTO>>();

/**
 * The model narrowed to one explorer domain: the elements the explorer lists under it, and the
 * relationships between them. The same placement the explorer draws, so a page that counts the
 * model shows the numbers the explorer shows.
 */
function scopeToDomain(model: MemoModelDTO, domain: string, ontologies: OntologyPackageInfo[]): MemoModelDTO {
    const key = `${domain}:${ontologies.length}`;
    let byDomain = domainCache.get(model);
    if (!byDomain) domainCache.set(model, byDomain = new Map());
    const cached = byDomain.get(key);
    if (cached) return cached;
    const tree = computeExplorerGroupTree(
        Object.values(model.elements), '', model.registries?.kinds ?? [], ontologies,
        model.packages ?? [], undefined, model.relationships ?? [], model.viewpoints ?? [],
    );
    const ids = explorerDomainIds(tree, domain);
    // A domain the model has nothing in is not a reason to empty every page: show the whole model.
    if (ids.size === 0) { byDomain.set(key, model); return model; }
    const scoped: MemoModelDTO = {
        ...model,
        elements: Object.fromEntries(Object.entries(model.elements).filter(([id]) => ids.has(id))),
        relationships: model.relationships.filter(relationship => ids.has(relationship.sourceId) && ids.has(relationship.targetId)),
    };
    byDomain.set(key, scoped);
    return scoped;
}

/** The model as the workspace and the explorer's domain show it: what every listing and count reads. */
export function useScopedModel(): MemoModelDTO | null {
    const model = useWorkspaceModel();
    const domain = useModelStore(s => s.explorerDomain);
    const ontologies = useModelStore(s => s.availableOntologies);
    return useMemo(() => (model && domain ? scopeToDomain(model, domain, ontologies) : model), [model, domain, ontologies]);
}

/**
 * The validation result as the chosen workspace shows it. memo-tools runs the rules once per
 * workspace (`memo validate --workspace`, plan T3) and sends each result with the whole one, so
 * this picks an answer and never filters the whole result by element: filtering would skip the
 * rule that another system's evidence does not count, and show a different number from the CLI.
 * The whole result when no workspace is chosen, or the server sent none for it. The explorer's
 * domain does not narrow it for the same reason.
 */
export function useScopedValidation(): ValidationResult | null {
    const validation = useModelStore(s => s.validation);
    const workspace = useModelStore(s => s.workspace);
    return validationForWorkspace(validation, workspace);
}
