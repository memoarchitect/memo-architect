import type { DiagramLayout } from '@memoarchitect/tools/browser';
import type { NotationLayoutNode, NotationLayoutEdge } from './notation-scene';

export const JOINTJS_RENDERER_ID = 'memo.renderer.jointjs';
export const X6_RENDERER_ID = 'memo.renderer.x6';
export const MAXGRAPH_RENDERER_ID = 'memo.renderer.maxgraph';
export const REACTFLOW_RENDERER_ID = 'memo.renderer.reactflow';
export type PilotLayout = DiagramLayout;
export interface ComparisonScene { nodes: NotationLayoutNode[]; edges: NotationLayoutEdge[] }

// Only the mounted authoring canvas can provide a live snapshot. No cross-project
// cache: the callback is removed when that canvas unmounts.
let source: { diagramId: string; read: () => ComparisonScene } | undefined;
let pending: { diagramId: string; scene: ComparisonScene } | undefined;
export function registerComparisonSource(diagramId: string, read: () => ComparisonScene): () => void {
    const registration = { diagramId, read };
    source = registration;
    return () => { if (source === registration) source = undefined; };
}
export function captureComparisonScene(diagramId: string): void {
    pending = source?.diagramId === diagramId ? { diagramId, scene: source.read() } : undefined;
}
export function discardComparisonScene(): void { pending = undefined; }
export function takeComparisonScene(diagramId: string): ComparisonScene | undefined {
    const result = pending?.diagramId === diagramId ? pending.scene : undefined;
    pending = undefined;
    return result;
}
export function diagramRendererId(layout: DiagramLayout | undefined, inherited: string, isIbd: boolean): string {
    const id = (layout as PilotLayout | undefined)?.canvas?.renderer ?? inherited;
    return (id === JOINTJS_RENDERER_ID || id === X6_RENDERER_ID) && !isIbd ? REACTFLOW_RENDERER_ID : id;
}
export function withDiagramRenderer(layout: DiagramLayout | undefined, renderer?: string): PilotLayout {
    const previous = layout ?? { nodes: {}, edges: {} };
    const next: PilotLayout = { ...previous, canvas: { ...previous.canvas, renderer } };
    if (!renderer) delete next.canvas!.renderer;
    return next;
}
