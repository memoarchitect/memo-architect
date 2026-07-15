// ─── OntologyDecompositionDiagram ─────────────────────────────────────────────
//
// Landing page for ontology mode. Shows a ReactFlow-based swimlane diagram of
// all available ontology packages connected by their `extends` chain.
//
// Enhancements in N-ONTO Session 4 (issue #184):
//   - ELK layered layout (RIGHT direction, BRANDES_KOEPF node placement)
//   - Click a package node  → fitView to that node and its descendants
//   - Double-click          → navigate to detail panel
//   - "Show Tracing" button → toggles `extends` edges via Zustand hiddenEdgeTypes
//   - Right-click a package → "Open source" context menu (vscode:// + WS fallback)
//   - Escape                → full fitView reset
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    useReactFlow,
    type Node as FlowNode,
    type Edge,
    type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { runLayoutProvider } from '../../diagram/layout-providers';

import { useModelStore } from '../../store/model-store';
import { sendOpenFile } from '../../store/ws-client';
import { OntologyPackageNode, type OntologyPackageNodeData } from './OntologyPackageNode';
import { OntologyLibraryPanel } from './OntologyLibraryPanel';
import type { OntologyPackageInfo } from '../../types/ontology';

const nodeTypes: NodeTypes = {
    ontologyPackage: OntologyPackageNode,
};

const NODE_WIDTH = 260;
const NODE_HEIGHT = 180;

/**
 * Run ELK on the package hierarchy. Uses the "ontology-swimlane" preset
 * (RIGHT direction, BRANDES_KOEPF node placement) called out in N-ONTO §6.4.
 */
async function layoutWithElk(packages: OntologyPackageInfo[]): Promise<{
    nodes: FlowNode[];
    edges: Edge[];
}> {
    const pkgByName = new Map(packages.map(p => [p.name, p]));

    const graph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.spacing.nodeNodeBetweenLayers': '100',
            'elk.spacing.nodeNode': '32',
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.padding': '[top=24, left=24, bottom=24, right=24]',
        },
        children: packages.map(p => ({
            id: p.name,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
        })),
        edges: packages
            .filter(p => p.extends && pkgByName.has(p.extends))
            .map((p, i) => ({
                id: `e-${i}`,
                sources: [p.extends!],
                targets: [p.name],
            })),
    } as any;

    const result = await runLayoutProvider(graph);
    const positions = new Map<string, { x: number; y: number }>();
    for (const child of (result.children ?? [])) {
        positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
    }

    const TYPE_EDGE_COLOR: Record<string, string> = {
        ontology: '#3B82F6',
        profile: '#10B981',
        extension: '#F59E0B',
    };

    const nodes: FlowNode[] = packages.map(pkg => ({
        id: pkg.name,
        type: 'ontologyPackage',
        position: positions.get(pkg.name) ?? { x: 0, y: 0 },
        data: {
            name: pkg.name,
            type: pkg.type,
            version: pkg.version,
            description: pkg.description,
            kindCount: pkg.kindCount,
            layerCount: pkg.layers.length,
            layers: pkg.layers.map(l => ({ id: l.id, label: l.label, color: l.color, kindCount: l.kindCount })),
            selected: pkg.selected,
            onClick: () => {},
        } satisfies OntologyPackageNodeData,
    }));

    const edges: Edge[] = [];
    for (const pkg of packages) {
        if (pkg.extends && pkgByName.has(pkg.extends)) {
            const color = TYPE_EDGE_COLOR[pkg.type] ?? '#94A3B8';
            edges.push({
                id: `${pkg.extends}->${pkg.name}`,
                source: pkg.extends,
                target: pkg.name,
                type: 'smoothstep',
                // Tag the edge with its semantic type so `hiddenEdgeTypes` can filter it.
                data: { edgeType: 'extends' },
                style: { stroke: color, strokeWidth: 2, strokeDasharray: '6 3' },
                animated: false,
                label: 'extends',
                labelStyle: { fontSize: 9, fill: color, fontWeight: 500 },
                labelBgStyle: { fill: '#F7F7F5', fillOpacity: 0.9 },
                labelBgPadding: [4, 2] as [number, number],
                markerEnd: { type: 'arrowclosed' as const, color, width: 14, height: 14 },
            });
        }
    }

    return { nodes, edges };
}

/** All descendants of `root` (inclusive) via extends edges. */
function subtreeOf(rootName: string, packages: OntologyPackageInfo[]): Set<string> {
    const children = new Map<string, string[]>();
    for (const p of packages) {
        if (p.extends) {
            if (!children.has(p.extends)) children.set(p.extends, []);
            children.get(p.extends)!.push(p.name);
        }
    }
    const out = new Set<string>([rootName]);
    const queue = [rootName];
    while (queue.length) {
        const n = queue.shift()!;
        for (const c of children.get(n) ?? []) {
            if (!out.has(c)) {
                out.add(c);
                queue.push(c);
            }
        }
    }
    return out;
}

interface ContextMenuState {
    x: number;
    y: number;
    packageName: string;
}

function OntologyDecompositionDiagramInner() {
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const setActiveView = useModelStore(s => s.setActiveView);
    const hiddenEdgeTypes = useModelStore(s => s.hiddenEdgeTypes);
    const toggleHiddenEdgeType = useModelStore(s => s.toggleHiddenEdgeType);

    const [showLibraryPanel, setShowLibraryPanel] = useState(false);
    const [laidOut, setLaidOut] = useState<{ nodes: FlowNode[]; edges: Edge[] }>({ nodes: [], edges: [] });
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const { fitView } = useReactFlow();

    // Re-run ELK whenever the package set changes
    useEffect(() => {
        let cancelled = false;
        layoutWithElk(availableOntologies).then(result => {
            if (!cancelled) setLaidOut(result);
        }).catch(err => {
            console.error('[OntologyDiagram] ELK layout failed:', err);
        });
        return () => { cancelled = true; };
    }, [availableOntologies]);

    // Double-click → navigate to detail
    const handleDoubleClick = useCallback((packageName: string) => {
        setActiveView({ type: 'ontology-detail', packageName });
    }, [setActiveView]);

    // Single click → zoom to package + descendants
    const handlePackageClick = useCallback((packageName: string) => {
        const subtree = subtreeOf(packageName, availableOntologies);
        const targetNodes = laidOut.nodes.filter(n => subtree.has(n.id));
        if (targetNodes.length === 0) return;
        fitView({ nodes: targetNodes.map(n => ({ id: n.id })), duration: 400, padding: 0.2 });
    }, [availableOntologies, laidOut.nodes, fitView]);

    const handleContextMenu = useCallback((e: React.MouseEvent, packageName: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, packageName });
    }, []);

    // Escape → full fitView reset (and dismiss context menu)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (contextMenu) { setContextMenu(null); return; }
            fitView({ padding: 0.1, duration: 300 });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [contextMenu, fitView]);

    // Wire click / double-click / contextmenu handlers into node data (data identity → memoized)
    const { nodes, edges } = useMemo(() => {
        const wired = laidOut.nodes.map(n => ({
            ...n,
            data: {
                ...(n.data as unknown as OntologyPackageNodeData),
                onClick: () => handlePackageClick(n.id),
                onDoubleClick: () => handleDoubleClick(n.id),
                onContextMenu: (e: React.MouseEvent) => handleContextMenu(e, n.id),
            } satisfies OntologyPackageNodeData,
        }));
        const visibleEdges = laidOut.edges.filter(e => {
            const t = (e.data as { edgeType?: string } | undefined)?.edgeType;
            return !t || !hiddenEdgeTypes.has(t);
        });
        return { nodes: wired, edges: visibleEdges };
    }, [laidOut, handlePackageClick, handleDoubleClick, handleContextMenu, hiddenEdgeTypes]);

    // Dismiss context menu when clicking outside
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!contextMenu) return;
        const onDown = (ev: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(ev.target as globalThis.Node)) {
                setContextMenu(null);
            }
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [contextMenu]);

    const tracingHidden = hiddenEdgeTypes.has('extends');

    if (availableOntologies.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#F7F7F5' }}>
                <div className="text-center" style={{ color: '#9CA3AF' }}>
                    <div className="text-3xl mb-3">&#9673;</div>
                    <div className="text-sm font-medium mb-1" style={{ color: '#374151' }}>
                        No ontology packages found
                    </div>
                    <div className="text-xs">Start the dev server to load ontology packages</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1" style={{ background: '#F7F7F5' }}>
            {/* Header / toolbar */}
            <div className="flex items-start justify-between px-6 pt-5 pb-3">
                <div>
                    <h2 className="text-base font-semibold" style={{ color: '#1a1a1a' }}>
                        Ontology Library
                    </h2>
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        {availableOntologies.length} package{availableOntologies.length !== 1 ? 's' : ''} available.
                        Click to zoom, double-click to open, right-click for source.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        data-testid="toggle-tracing"
                        onClick={() => toggleHiddenEdgeType('extends')}
                        title={tracingHidden ? 'Show extends tracing edges' : 'Hide extends tracing edges'}
                        className="px-3 py-1.5 text-xs rounded-lg font-medium"
                        style={tracingHidden
                            ? { background: '#F0F0ED', color: '#6B7280', border: '1px solid #E5E5E0' }
                            : { background: '#1B3A4B', color: '#2DD4A8', border: '1px solid transparent' }}
                    >
                        {tracingHidden ? 'Show Tracing' : 'Hide Tracing'}
                    </button>
                    <button
                        onClick={() => setShowLibraryPanel(true)}
                        className="px-3 py-1.5 text-xs rounded-lg font-medium"
                        style={{ background: '#1B3A4B', color: '#2DD4A8' }}
                    >
                        + Add Ontology
                    </button>
                </div>
            </div>

            {showLibraryPanel && <OntologyLibraryPanel onClose={() => setShowLibraryPanel(false)} />}

            <div style={{ flex: 1, height: 'calc(100% - 72px)' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.1 }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnScroll
                    zoomOnDoubleClick={false}
                    minZoom={0.2}
                    maxZoom={2.5}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#E5E5E0" gap={24} size={1} />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </div>

            {contextMenu && (
                <ContextMenu
                    menuRef={menuRef}
                    state={contextMenu}
                    onClose={() => setContextMenu(null)}
                    packages={availableOntologies}
                />
            )}
        </div>
    );
}

// ─── Context menu ─────────────────────────────────────────────────────────────

interface ContextMenuProps {
    state: ContextMenuState;
    onClose: () => void;
    packages: OntologyPackageInfo[];
    menuRef: React.MutableRefObject<HTMLDivElement | null>;
}

const ContextMenu = ({ state, onClose, packages, menuRef }: ContextMenuProps) => {
    const pkg = packages.find(p => p.name === state.packageName);

    function openSource() {
        if (!pkg) return;
        // Prefer the dev-server round-trip (works for any editor / platform).
        // The server opens the file with the system default; in dev with VS Code
        // installed this is equivalent to vscode://file/<abs path>.
        const manifestRel = pkg.rootDir
            ? `${pkg.rootDir}/memo.package.yaml`
            : '';
        if (manifestRel) {
            sendOpenFile(manifestRel);
        } else {
            // Fallback: try vscode:// with package name as a hint (rarely works but cheap)
            window.open(`vscode://file/${encodeURIComponent(pkg.name)}`);
        }
        onClose();
    }

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                top: state.y,
                left: state.x,
                zIndex: 1000,
                background: '#FFFFFF',
                border: '1px solid #E5E5E0',
                borderRadius: '8px',
                boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                padding: '4px',
                minWidth: '180px',
                fontSize: '12px',
            }}
        >
            <div style={{ padding: '6px 10px', color: '#9CA3AF', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {state.packageName}
            </div>
            <button
                onClick={openSource}
                disabled={!pkg?.rootDir}
                style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    background: 'transparent',
                    cursor: pkg?.rootDir ? 'pointer' : 'not-allowed',
                    color: pkg?.rootDir ? '#1a1a1a' : '#9CA3AF',
                    borderRadius: '4px',
                }}
                onMouseEnter={e => { if (pkg?.rootDir) e.currentTarget.style.background = '#F0F0ED'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
                Open source
            </button>
        </div>
    );
};

export function OntologyDecompositionDiagram() {
    return (
        <ReactFlowProvider>
            <OntologyDecompositionDiagramInner />
        </ReactFlowProvider>
    );
}

export default OntologyDecompositionDiagram;
