// Canonical IR → notation-scene semantic bridge.
// Layout may choose positions, but identity, source range, and fallback status
// belong to the compiler IR and are attached before any renderer sees a scene.

import type { NotationScene } from './notation-scene';

type IrRecord = {
    kind: 'mapped' | 'generic';
    memoElementId?: string;
    identity: { id: string; metaclass?: string; declarationPath?: string };
    source?: { start?: { line?: number; column?: number } };
    standardProperties?: { name?: unknown };
    unmappable?: string;
};

export function projectIrSemantics(scene: NotationScene, records: readonly IrRecord[] | undefined): NotationScene {
    if (!records?.length) return scene;
    const mapped = new Map(records.filter((r): r is IrRecord & { memoElementId: string } => r.kind === 'mapped' && typeof r.memoElementId === 'string').map(r => [r.memoElementId, r]));
    scene.nodes = scene.nodes.map(node => {
        const record = mapped.get(node.subjectId);
        if (!record) return node;
        return {
            ...node,
            subjectId: record.identity.id,
            kind: record.identity.metaclass ?? node.kind,
            sourceRange: record.source?.start?.line === undefined ? node.sourceRange : {
                start: record.source.start.line,
                end: record.source.start.line,
            },
            accessibilityText: `${node.accessibilityText}; SysML subject ${record.identity.id}`,
        };
    });
    return scene;
}
