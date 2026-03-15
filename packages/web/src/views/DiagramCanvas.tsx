import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { MemoElement } from '@memo/core';
import { useModelStore, getDiagram } from '../store/model-store';
import { DIAGRAM_TYPE_META } from '../constants';
import { computeLayout } from './layout';

export function DiagramCanvas() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const selectElement = useModelStore(s => s.selectElement);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLayouting, setIsLayouting] = useState(false);

    // Get the selected diagram (if any)
    const selectedDiagram = getDiagram(model, selectedDiagramId);
    const diagramMeta = selectedDiagram ? DIAGRAM_TYPE_META[selectedDiagram.diagramType] : null;

    // Build viewpoint filter from selected viewpoint/diagram + hidden layers
    const viewpointFilter = useMemo(() => {
        // Determine effective viewpoint: diagram's viewpoint takes precedence
        const effectiveVpId = selectedDiagram?.viewpointId === '__model'
            ? null
            : (selectedDiagram?.viewpointId || selectedViewpointId);

        const hasViewpoint = effectiveVpId && model?.viewpoints;
        const hasHidden = hiddenLayers.size > 0;
        const diagramElementIds = selectedDiagram?.elementIds
            ? new Set(selectedDiagram.elementIds)
            : undefined;

        if (!hasViewpoint && !hasHidden && !diagramElementIds) return undefined;

        const vp = hasViewpoint
            ? model!.viewpoints!.find(v => v.id === effectiveVpId)
            : undefined;

        const vpKinds = vp ? new Set(vp.visibleKinds) : undefined;
        const vpLayers = vp ? new Set(vp.visibleLayers) : undefined;

        return (el: MemoElement) => {
            // Layer toggle: hide if layer is toggled off
            if (hiddenLayers.has(el.layer)) return false;
            // Diagram element subset filter
            if (diagramElementIds) return diagramElementIds.has(el.id);
            // Viewpoint filter
            if (vpKinds && vpLayers) {
                return vpKinds.has(el.kind) || vpLayers.has(el.layer);
            }
            return true;
        };
    }, [selectedViewpointId, selectedDiagram, model?.viewpoints, hiddenLayers]);

    // Recompute layout when model or viewpoint changes
    useEffect(() => {
        if (!model) return;

        setIsLayouting(true);
        computeLayout(model, { viewpointFilter })
            .then(({ nodes: n, edges: e }) => {
                setNodes(n);
                setEdges(e);
                setIsLayouting(false);
            })
            .catch(err => {
                console.error('Layout error:', err);
                setIsLayouting(false);
            });
    }, [model, viewpointFilter]);

    // Highlight selected element
    useEffect(() => {
        if (!selectedElementId) return;

        setNodes(prev => prev.map(n => ({
            ...n,
            style: {
                ...n.style,
                boxShadow: n.id === selectedElementId
                    ? `0 0 0 2px #2DD4A8, 0 4px 12px rgba(45, 212, 168, 0.3)`
                    : undefined,
                opacity: selectedElementId
                    ? (n.id === selectedElementId ? 1 : 0.35)
                    : 1,
            },
        })));
    }, [selectedElementId]);

    const onNodeClick = useCallback((_: any, node: Node) => {
        selectElement(node.id);
    }, [selectElement]);

    const onPaneClick = useCallback(() => {
        selectElement(null);
        // Reset opacity
        setNodes(prev => prev.map(n => ({
            ...n,
            style: { ...n.style, opacity: 1, boxShadow: undefined },
        })));
    }, [selectElement]);

    return (
        <div className="flex-1 relative">
            {/* Diagram header */}
            {selectedDiagram && (
                <div
                    className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                    {diagramMeta && (
                        <span className="px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: diagramMeta.color + '20', color: diagramMeta.color, fontSize: '9px' }}>
                            {diagramMeta.code}
                        </span>
                    )}
                    <span className="font-medium" style={{ color: '#1a1a1a' }}>{selectedDiagram.name}</span>
                    {selectedDiagram.auto && (
                        <span style={{ color: '#9CA3AF', fontSize: '9px' }}>AUTO</span>
                    )}
                </div>
            )}
            {isLayouting && (
                <div
                    className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                >
                    Computing layout...
                </div>
            )}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                fitView
                minZoom={0.1}
                maxZoom={3}
                proOptions={{ hideAttribution: true }}
                style={{ background: '#F7F7F5' }}
            >
                <Background color="#E5E5E0" gap={20} size={1} />
                <Controls />
                <MiniMap
                    style={{ background: '#FFFFFF' }}
                    nodeColor={(node) => (node.data as any)?.color || '#ccc'}
                    maskColor="rgba(247, 247, 245, 0.7)"
                />
            </ReactFlow>
        </div>
    );
}
