import { useMemo } from 'react';
import { Background, Controls, ReactFlow, useReactFlow, type Edge, type Node } from '@xyflow/react';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import type { DiagramEmbed } from '../diagram/diagram-embed-context';
import { ContextBoundaryNode, ContextExternalNode, ContextSystemNode } from './ContextNodes';
import { DiagramViewControls } from './DiagramViewControls';
import { UseCaseEdge } from './UseCaseEdge';
import { computeContextViewLayout } from './templates/context-view';
import '@xyflow/react/dist/style.css';

const nodeTypes = { contextBoundary: ContextBoundaryNode, contextExternal: ContextExternalNode, contextSystem: ContextSystemNode };
const edgeTypes = { useCaseEdge: UseCaseEdge };
type Element = MemoModelDTO['elements'][string];
const fitOptions = { padding: 0.16, maxZoom: 1.15 };

function ContextViewControls() {
    const { fitView } = useReactFlow();
    return <Controls position="bottom-right" showFitView={false} showInteractive={false} style={{ zIndex: 6 }}>
        <DiagramViewControls onFit={() => { void fitView({ ...fitOptions, duration: 250 }); }} />
    </Controls>;
}

export function ScopedContextDiagram({ model, system, links, systems, label, onExplore }: {
    model: MemoModelDTO;
    system: Element;
    links: MemoModelDTO['relationships'];
    systems: ReadonlySet<string>;
    label: (element: Element) => string;
    onExplore: NonNullable<DiagramEmbed['onExplore']>;
}) {
    const { nodes, edges } = useMemo(() => {
        const elements = { [system.id]: system };
        const participantSides = new Map<string, 'left' | 'right' | 'bottom'>();
        // Collapse occurrence endpoints only for display. Keep each link's ID
        // so inspection and removal still address its authored relationship.
        const relationships = links.map(edge => {
            const participant = model.elements[edge.sourceId];
            elements[participant.id] = { ...participant, name: label(participant) };
            participantSides.set(participant.id, edge.type.toLowerCase() === 'appliesincontext'
                ? 'bottom' : systems.has(participant.id) ? 'right' : 'left');
            return {
                ...edge, targetId: system.id,
                attributes: { ...edge.attributes, interactionLabel: edge.attributes?.interactionLabel
                    || (edge.type.toLowerCase() === 'appliesincontext' ? 'Used in' : 'Interacts with') },
            };
        });
        return computeContextViewLayout({ ...model, elements, relationships }, system.name, {
            subjectElement: system.id,
            participantSides,
            edgeStyle: 'rounded',
        });
    }, [model, system, links, systems, label]);
    return <ReactFlow
        nodes={nodes.map(node => ({ ...node, extent: node.parentId ? 'parent' : undefined,
            focusable: node.type !== 'contextBoundary' })) as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={fitOptions}
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        preventScrolling={false}
        onNodeClick={(_, node) => { if (node.type !== 'contextBoundary') onExplore({ type: 'element', id: node.id }); }}
        onEdgeClick={(_, edge) => onExplore({ type: 'relationship', id: edge.id })}
    >
        <Background gap={20} />
        <ContextViewControls />
    </ReactFlow>;
}
