import type { Edge, Node } from '@xyflow/react';
import type { MemoElement, MemoModelDTO } from '@memoarchitect/tools/browser';
import type { LayoutResult } from '../layout';

const ACTOR_KINDS = /(?:Actor|User)$/;
const USE_CASE_KINDS = new Set(['UseCase']);
const ASSOCIATION_TYPES = new Set(['Initiates', 'Performs', 'InteractsWith', 'Includes', 'Extends']);

export function isUseCaseActor(element: MemoElement): boolean {
    return ACTOR_KINDS.test(element.kind) || element.construct === 'actor';
}

export function isUseCase(element: MemoElement): boolean {
    return USE_CASE_KINDS.has(element.kind) || element.construct === 'use case';
}

export interface UseCaseViewOptions {
    viewpointFilter?: (element: MemoElement) => boolean;
    systemName?: string;
}

/** Lay out a classic use-case diagram: actors outside a system boundary, use cases inside. */
export function computeUseCaseViewLayout(model: MemoModelDTO, options: UseCaseViewOptions = {}): LayoutResult {
    const visible = Object.values(model.elements).filter(element => !options.viewpointFilter || options.viewpointFilter(element));
    const actors = visible.filter(isUseCaseActor);
    const useCases = visible.filter(isUseCase);
    const shown = new Set([...actors, ...useCases].map(element => element.id));
    if (useCases.length === 0) return { nodes: [], edges: [] };

    const cols = Math.max(1, Math.ceil(Math.sqrt(useCases.length)));
    const rows = Math.ceil(useCases.length / cols);
    const width = Math.max(520, cols * 210 + 100);
    const height = Math.max(320, rows * 150 + 100);
    const nodes: Node[] = [{
        id: '__use_case_boundary__', type: 'useCaseBoundary', position: { x: 130, y: 28 },
        data: { label: options.systemName || 'System Boundary', isFrame: true, kind: 'System Boundary' },
        style: { width, height }, draggable: false, selectable: false, zIndex: -1,
    }];
    useCases.forEach((element, index) => {
        const col = index % cols, row = Math.floor(index / cols);
        nodes.push({
            id: element.id, type: 'useCase', position: { x: 130 + 55 + col * 210, y: 28 + 62 + row * 150 },
            data: { label: element.name, kind: element.kind, color: '#E67E22' }, style: { width: 150, height: 82 },
        });
    });
    actors.forEach((element, index) => {
        const right = index % 2 === 1;
        const row = Math.floor(index / 2);
        nodes.push({
            id: element.id, type: 'useCaseActor', position: { x: right ? width + 165 : 15, y: 65 + row * 115 },
            data: { label: element.name, kind: element.kind, color: '#334155' }, style: { width: 95, height: 86 },
        });
    });
    const edges: Edge[] = model.relationships
        .filter(rel => shown.has(rel.sourceId) && shown.has(rel.targetId) && (ASSOCIATION_TYPES.has(rel.type) || true))
        .map(rel => ({
            id: rel.id, source: rel.sourceId, target: rel.targetId,
            label: /^(Includes|Extends)$/.test(rel.type) ? `«${rel.type.toLowerCase()}»` : undefined,
            type: 'smoothstep', style: { stroke: '#64748B', strokeWidth: 1.4, strokeDasharray: /^(Includes|Extends)$/.test(rel.type) ? '5 4' : undefined },
        }));
    return { nodes, edges };
}
