import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { MemoElement } from '@memo/core';
import { useModelStore, getDiagram } from '../store/model-store';
import { DIAGRAM_TYPE_META } from '../constants';
import { FONT } from '../styles/tokens';
import {
    computeLayout,
    computeDecompositionLayout,
    computeContainmentLayout,
    computeFBSLayout,
    buildDecompositionTree,
    buildFunctionalTree,
} from './layout';
import { DecompositionNode } from './DecompositionNode';

// Stable constant objects — prevents ReactFlow internal getSnapshot from seeing new references each render
const RF_STYLE = { background: '#F7F7F5' } as const;
const RF_FIT_VIEW_OPTIONS = { padding: 0.08, maxZoom: 2 } as const;
const MINIMAP_STYLE = { background: '#FFFFFF' } as const;
const RF_PRO_OPTIONS = { hideAttribution: true } as const;

function DiagramCanvasInner() {
    const model = useModelStore(s => s.model);
    const selectedElementId = useModelStore(s => s.selectedElementId);
    const selectedViewpointId = useModelStore(s => s.selectedViewpointId);
    const selectedDiagramId = useModelStore(s => s.selectedDiagramId);
    const hiddenLayers = useModelStore(s => s.hiddenLayers);
    const selectElement = useModelStore(s => s.selectElement);
    const { fitView } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isLayouting, setIsLayouting] = useState(false);
    const [layoutVersion, setLayoutVersion] = useState(0);

    // Get the selected diagram (if any)
    const selectedDiagram = getDiagram(model, selectedDiagramId);
    const diagramMeta = selectedDiagram ? DIAGRAM_TYPE_META[selectedDiagram.diagramType] : null;
    const isDecompDiagram = !!selectedDiagram?.properties?.layoutStyle;

    // Decomposition/FBS diagram state
    const [layoutStyle, setLayoutStyle] = useState<'containment' | 'decomposition'>('containment');
    const isFBSDiagram = selectedDiagram?.properties?.layoutStyle === 'fbs';

    // Interactive state for decomposition/containment diagrams
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [nodeDirections, setNodeDirections] = useState<Map<string, 'vertical' | 'horizontal'>>(new Map());
    const positionCacheRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    // Register custom node types
    const nodeTypes = useMemo(() => ({ decompositionNode: DecompositionNode }), []);

    // Stable nodeColor for MiniMap — inline arrow functions cause infinite loops
    const miniMapNodeColor = useCallback((node: any) => node.data?.color || node.data?.layerColor || '#ccc', []);

    // Interactive callbacks
    const toggleExpand = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    }, []);

    const toggleDirection = useCallback((nodeId: string) => {
        // Clear position cache for descendants to force re-layout
        if (model) {
            const tree = isFBSDiagram ? buildFunctionalTree(model) : buildDecompositionTree(model);
            const clearDescendants = (id: string) => {
                positionCacheRef.current.delete(id);
                for (const cid of (tree.childrenMap.get(id) || [])) {
                    clearDescendants(cid);
                }
            };
            clearDescendants(nodeId);
        }
        setNodeDirections(prev => {
            const next = new Map(prev);
            const current = next.get(nodeId) || 'vertical';
            next.set(nodeId, current === 'vertical' ? 'horizontal' : 'vertical');
            return next;
        });
    }, [model, isFBSDiagram]);

    const expandAll = useCallback(() => {
        if (!model) return;
        const tree = isFBSDiagram ? buildFunctionalTree(model) : buildDecompositionTree(model);
        const allIds = new Set<string>();
        const collectAll = (id: string) => {
            allIds.add(id);
            for (const cid of (tree.childrenMap.get(id) || [])) {
                if (tree.elements.has(cid)) collectAll(cid);
            }
        };
        for (const rootId of tree.roots) {
            if (tree.elements.has(rootId)) collectAll(rootId);
        }
        setExpandedNodes(allIds);
    }, [model, isFBSDiagram]);

    const collapseAll = useCallback(() => {
        setExpandedNodes(new Set());
    }, []);

    const resetLayout = useCallback(() => {
        positionCacheRef.current.clear();
        setLayoutVersion(v => v + 1);
    }, []);

    // Build viewpoint filter from selected viewpoint/diagram + hidden layers
    const viewpointFilter = useMemo(() => {
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
            if (hiddenLayers.has(el.layer)) return false;
            if (diagramElementIds) return diagramElementIds.has(el.id);
            if (vpKinds && vpLayers) {
                return vpKinds.has(el.kind) || vpLayers.has(el.layer);
            }
            return true;
        };
    }, [selectedViewpointId, selectedDiagram, model?.viewpoints, hiddenLayers]);

    // Recompute layout when model, viewpoint, or interactive state changes
    useEffect(() => {
        if (!model) return;

        if (isFBSDiagram) {
            // FBS layout — functional tree with expand/collapse
            setIsLayouting(true);
            computeFBSLayout(model, {
                expandedNodes,
                nodeDirections,
                callbacks: { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection },
            }).then(({ nodes: n, edges: e }) => {
                setNodes(n);
                setEdges(e);
                setIsLayouting(false);
                setLayoutVersion(v => v + 1);
            }).catch(err => {
                console.error('FBS layout error:', err);
                setIsLayouting(false);
            });
        } else if (isDecompDiagram) {
            if (layoutStyle === 'decomposition') {
                setIsLayouting(true);
                computeDecompositionLayout(model, {
                    expandedNodes,
                    nodeDirections,
                    callbacks: { onToggleExpand: toggleExpand, onToggleDirection: toggleDirection },
                }).then(({ nodes: n, edges: e }) => {
                    setNodes(n);
                    setEdges(e);
                    setIsLayouting(false);
                    setLayoutVersion(v => v + 1);
                }).catch(err => {
                    console.error('Layout error:', err);
                    setIsLayouting(false);
                });
            } else {
                // Containment — synchronous
                const result = computeContainmentLayout(model, {
                    expandedNodes,
                    callbacks: { onToggleExpand: toggleExpand },
                });
                setNodes(result.nodes);
                setEdges(result.edges);
                setLayoutVersion(v => v + 1);
            }
        } else {
            setIsLayouting(true);
            computeLayout(model, { viewpointFilter })
                .then(({ nodes: n, edges: e }) => {
                    setNodes(n);
                    setEdges(e);
                    setIsLayouting(false);
                    setLayoutVersion(v => v + 1);
                })
                .catch(err => {
                    console.error('Layout error:', err);
                    setIsLayouting(false);
                });
        }
    }, [model, viewpointFilter, isDecompDiagram, isFBSDiagram, layoutStyle, expandedNodes, nodeDirections, toggleExpand, toggleDirection]);

    // Re-fit view after layout updates
    useEffect(() => {
        if (layoutVersion === 0) return;
        const timer = setTimeout(() => {
            fitView({ padding: 0.08, maxZoom: 2, duration: 500 });
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
                boxShadow: n.id === selectedElementId
                    ? `0 0 0 2px #2DD4A8, 0 4px 12px rgba(45, 212, 168, 0.3)`
                    : undefined,
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
            style: { ...n.style, opacity: 1, boxShadow: undefined },
        })));
    }, [selectElement]);

    const onNodeDragStop = useCallback((_: any, node: Node) => {
        positionCacheRef.current.set(node.id, node.position);
    }, []);

    if (!selectedDiagram && nodes.length === 0 && !isLayouting) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
                <div className="text-center" style={{ maxWidth: '320px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>{'\u{1F4CA}'}</div>
                    <h3 style={{ fontSize: FONT.lg, fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        Select a Diagram
                    </h3>
                    <p style={{ fontSize: FONT.md, color: '#9CA3AF', lineHeight: 1.6 }}>
                        Choose a diagram from the sidebar to visualize your model elements and relationships.
                    </p>
                </div>
            </div>
        );
    }

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
                            style={{ background: diagramMeta.color + '20', color: diagramMeta.color, fontSize: FONT.badge }}>
                            {diagramMeta.code}
                        </span>
                    )}
                    <span className="font-medium" style={{ color: '#1a1a1a' }}>{selectedDiagram.name}</span>
                    {selectedDiagram.auto && (
                        <span style={{ color: '#9CA3AF', fontSize: '9px' }}>auto</span>
                    )}

                    {/* FBS controls */}
                    {isFBSDiagram && (
                        <>
                            <span style={{ color: '#E5E5E0' }}>|</span>
                            <button
                                onClick={expandAll}
                                className="px-2 py-0.5 text-xs font-medium rounded"
                                style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                title="Expand all functions"
                            >
                                Expand All
                            </button>
                            <button
                                onClick={collapseAll}
                                className="px-2 py-0.5 text-xs font-medium rounded"
                                style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                title="Collapse all functions"
                            >
                                Collapse All
                            </button>
                        </>
                    )}

                    {/* Decomposition controls */}
                    {isDecompDiagram && !isFBSDiagram && (
                        <>
                            <span style={{ color: '#E5E5E0' }}>|</span>
                            {/* Containment / Decomposition toggle */}
                            <div className="flex rounded overflow-hidden" style={{ border: '1px solid #E5E5E0' }}>
                                {(['containment', 'decomposition'] as const).map(style => (
                                    <button
                                        key={style}
                                        onClick={() => {
                                            setLayoutStyle(style);
                                            positionCacheRef.current.clear();
                                        }}
                                        className="px-2 py-0.5 text-xs font-medium"
                                        style={{
                                            background: layoutStyle === style ? '#1B3A4B' : '#FFFFFF',
                                            color: layoutStyle === style ? '#FFFFFF' : '#6B7280',
                                        }}
                                    >
                                        {style === 'containment' ? 'Containment' : 'Decomposition'}
                                    </button>
                                ))}
                            </div>

                            <span style={{ color: '#E5E5E0' }}>|</span>

                            {/* Expand All / Collapse All */}
                            <button
                                onClick={expandAll}
                                className="px-2 py-0.5 text-xs font-medium rounded"
                                style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                title="Expand all nodes"
                            >
                                Expand All
                            </button>
                            <button
                                onClick={collapseAll}
                                className="px-2 py-0.5 text-xs font-medium rounded"
                                style={{ background: '#F7F7F5', color: '#374151', border: '1px solid #E5E5E0' }}
                                title="Collapse all nodes"
                            >
                                Collapse All
                            </button>
                        </>
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
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onNodeDragStop={onNodeDragStop}
                fitView
                fitViewOptions={RF_FIT_VIEW_OPTIONS}
                minZoom={0.2}
                maxZoom={3}
                zoomOnScroll
                panOnScroll
                panOnScrollMode={"free" as any}
                proOptions={RF_PRO_OPTIONS}
                style={RF_STYLE}
            >
                <Background color="#EAEAE6" gap={20} size={1} />
                <Controls />
                <MiniMap
                    style={MINIMAP_STYLE}
                    nodeColor={miniMapNodeColor}
                    maskColor="rgba(247, 247, 245, 0.7)"
                />
            </ReactFlow>
        </div>
    );
}

// Wrap in ReactFlowProvider so useReactFlow() works
export function DiagramCanvas() {
    return (
        <ReactFlowProvider>
            <DiagramCanvasInner />
        </ReactFlowProvider>
    );
}
