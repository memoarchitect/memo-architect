// ─── ActionFlowDiagram ───────────────────────────────────────────────────────
//
// SysML v2 Action Flow Diagram renderer using ReactFlow.
// Shows actions as process boxes with typed ports, directed flows between
// them labeled with item types, succession ordering, and swim-lane grouping
// by subsystem allocation.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    useReactFlow,
    type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useModelStore } from '../store/model-store';
import { LAYER_COLORS } from '../constants';
import { FONT } from '../styles/tokens';
import { computeActionFlowLayout } from './layout';
import { ActionFlowNode } from './ActionFlowNode';

function ActionFlowDiagramInner() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectElement = useModelStore(s => s.selectElement);
    const { fitView } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [layoutVersion, setLayoutVersion] = useState(0);
    const [isLayouting, setIsLayouting] = useState(false);

    const nodeTypes = useMemo(() => ({ actionFlowNode: ActionFlowNode }), []);

    // Compute layout when model changes
    useEffect(() => {
        if (!model) return;

        setIsLayouting(true);
        computeActionFlowLayout(model)
            .then(({ nodes: n, edges: e }) => {
                setNodes(n);
                setEdges(e);
                setIsLayouting(false);
                setLayoutVersion(v => v + 1);
            })
            .catch(err => {
                console.error('Action flow layout error:', err);
                setIsLayouting(false);
            });
    }, [model]);

    // Re-fit view after layout
    useEffect(() => {
        if (layoutVersion === 0) return;
        const timer = setTimeout(() => {
            fitView({ padding: 0.1, maxZoom: 1.5, duration: 500 });
        }, 200);
        return () => clearTimeout(timer);
    }, [layoutVersion, fitView]);

    // Highlight selected element
    useEffect(() => {
        if (!selectedElementId) return;
        setNodes(prev => prev.map(n => ({
            ...n,
            style: {
                ...n.style,
                opacity: selectedElementId
                    ? (n.id === selectedElementId ? 1 : 0.5)
                    : 1,
            },
        })));
    }, [selectedElementId]);

    const onNodeClick = useCallback((_: any, node: Node) => {
        selectElement(node.id);
    }, [selectElement]);

    const onPaneClick = useCallback(() => {
        selectElement(null);
        setNodes(prev => prev.map(n => ({
            ...n,
            style: { ...n.style, opacity: 1 },
        })));
    }, [selectElement]);

    // Count behavior elements
    const behaviorCount = useMemo(() => {
        if (!model) return 0;
        return Object.values(model.elements).filter(
            el => el.kind === 'ActionDefinition' || el.kind === 'ActionUsage' || el.kind === 'ItemDefinition'
        ).length;
    }, [model]);

    if (!model || behaviorCount === 0) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: '#9CA3AF' }}>
                <div className="text-center max-w-md">
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{'\u2699\uFE0F'}</div>
                    <h3 style={{ fontSize: FONT.lg, fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        No Behavior Elements
                    </h3>
                    <p style={{ fontSize: FONT.md, lineHeight: '1.6' }}>
                        Add <code>action def</code> and <code>flow</code> constructs to your model
                        to see the Action Flow Diagram.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 relative">
            {/* Diagram header */}
            <div
                className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
                <span className="px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: '#FF6B6B20', color: '#FF6B6B', fontSize: FONT.badge }}>
                    AFD
                </span>
                <span className="font-medium" style={{ color: '#1a1a1a' }}>Action Flow Diagram</span>
                <span style={{ color: '#9CA3AF', fontSize: FONT.badge }}>
                    {nodes.length} nodes · {edges.length} edges
                </span>
            </div>

            {/* Legend */}
            <div
                className="absolute bottom-3 left-3 z-10 flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: '#FFFFFF', border: '1px solid #E5E5E0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '16px', height: '2px', background: '#3498DB', display: 'inline-block' }} />
                    <span style={{ color: '#6B7280' }}>Material flow</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '16px', height: '2px', background: '#3498DB', display: 'inline-block', borderTop: '2px dashed #3498DB' }} />
                    <span style={{ color: '#6B7280' }}>Signal/Info flow</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '16px', height: '1px', background: '#D1D5DB', display: 'inline-block', borderTop: '1px dashed #D1D5DB' }} />
                    <span style={{ color: '#6B7280' }}>Succession</span>
                </span>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.2}
                maxZoom={3}
                zoomOnScroll
                panOnScroll
                panOnScrollMode={"free" as any}
                proOptions={{ hideAttribution: true }}
                style={{ background: '#F7F7F5' }}
            >
                <Background color="#EAEAE6" gap={20} size={1} />
                <Controls
                    position="top-right"
                    style={{ top: '12px', right: '12px' }}
                />
                <MiniMap
                    position="bottom-right"
                    nodeColor={(node) => {
                        const data = node.data as any;
                        return data?.laneColor || data?.layerColor || '#9CA3AF';
                    }}
                    style={{ width: 120, height: 80, borderRadius: '8px' }}
                />
            </ReactFlow>

            {isLayouting && (
                <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.6)', zIndex: 20 }}>
                    <span className="animate-pulse" style={{ color: '#6B7280' }}>Computing layout...</span>
                </div>
            )}
        </div>
    );
}

export function ActionFlowDiagram() {
    return (
        <ReactFlowProvider>
            <ActionFlowDiagramInner />
        </ReactFlowProvider>
    );
}
