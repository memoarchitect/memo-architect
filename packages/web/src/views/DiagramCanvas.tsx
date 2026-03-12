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
import { useModelStore } from '../store/model-store';
import { computeLayout } from './layout';

export function DiagramCanvas() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectElement = useModelStore(s => s.selectElement);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLayouting, setIsLayouting] = useState(false);

    // Build viewpoint filter from selected viewpoint
    const viewpointFilter = useMemo(() => {
        if (!selectedViewpointId || !model?.viewpoints) return undefined;
        const vp = model.viewpoints.find(v => v.id === selectedViewpointId);
        if (!vp) return undefined;
        const kinds = new Set(vp.visibleKinds);
        const layers = new Set(vp.visibleLayers);
        return (el: MemoElement) => kinds.has(el.kind) || layers.has(el.layer);
    }, [selectedViewpointId, model?.viewpoints]);

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
                    ? `0 0 16px ${(n.data as any).color || '#e94560'}`
                    : undefined,
                opacity: selectedElementId
                    ? (n.id === selectedElementId ? 1 : 0.4)
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
            {isLayouting && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-400 border border-slate-700">
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
                style={{ background: '#0f172a' }}
            >
                <Background color="#1e293b" gap={20} />
                <Controls
                    style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                    }}
                />
                <MiniMap
                    style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                    }}
                    nodeColor={(node) => (node.data as any)?.color || '#666'}
                    maskColor="rgba(15, 23, 42, 0.6)"
                />
            </ReactFlow>
        </div>
    );
}
