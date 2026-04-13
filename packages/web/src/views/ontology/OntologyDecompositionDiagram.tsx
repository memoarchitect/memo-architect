// ─── OntologyDecompositionDiagram ─────────────────────────────────────────────
//
// Landing page for ontology mode. Shows a ReactFlow-based hierarchy diagram
// of all available ontology packages connected by their `extends` chain.
// Clicking a package node navigates to its detail page.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useCallback, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    type Node,
    type Edge,
    type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useModelStore } from '../../store/model-store';
import { OntologyPackageNode, type OntologyPackageNodeData } from './OntologyPackageNode';
import { OntologyLibraryPanel } from './OntologyLibraryPanel';
import type { OntologyPackageInfo } from '../../types/ontology';

const nodeTypes: NodeTypes = {
    ontologyPackage: OntologyPackageNode,
};

/**
 * Simple tree layout: organize packages in a top-down hierarchy.
 * Root packages (no extends) at the top, children below.
 */
function layoutPackages(packages: OntologyPackageInfo[]): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Build adjacency: parent -> children
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();
    const pkgByName = new Map<string, OntologyPackageInfo>();

    for (const pkg of packages) {
        pkgByName.set(pkg.name, pkg);
        if (pkg.extends) {
            parentMap.set(pkg.name, pkg.extends);
            if (!childrenMap.has(pkg.extends)) childrenMap.set(pkg.extends, []);
            childrenMap.get(pkg.extends)!.push(pkg.name);
        }
    }

    // Find roots (no parent or parent not in available packages)
    const roots = packages.filter(p => !p.extends || !pkgByName.has(p.extends));

    // BFS to assign levels and positions
    const levels = new Map<string, number>();
    const queue: string[] = [];

    for (const r of roots) {
        levels.set(r.name, 0);
        queue.push(r.name);
    }

    while (queue.length > 0) {
        const name = queue.shift()!;
        const level = levels.get(name)!;
        const children = childrenMap.get(name) ?? [];
        for (const child of children) {
            if (!levels.has(child)) {
                levels.set(child, level + 1);
                queue.push(child);
            }
        }
    }

    // Assign any orphans not yet leveled
    for (const pkg of packages) {
        if (!levels.has(pkg.name)) levels.set(pkg.name, 0);
    }

    // Group by level
    const byLevel = new Map<number, OntologyPackageInfo[]>();
    for (const pkg of packages) {
        const level = levels.get(pkg.name) ?? 0;
        if (!byLevel.has(level)) byLevel.set(level, []);
        byLevel.get(level)!.push(pkg);
    }

    const NODE_WIDTH = 280;
    const NODE_GAP_X = 40;
    const NODE_GAP_Y = 120;

    // Position nodes
    const maxLevel = Math.max(...byLevel.keys(), 0);
    for (let level = 0; level <= maxLevel; level++) {
        const pkgs = byLevel.get(level) ?? [];
        const totalWidth = pkgs.length * NODE_WIDTH + (pkgs.length - 1) * NODE_GAP_X;
        const startX = -totalWidth / 2;

        for (let i = 0; i < pkgs.length; i++) {
            const pkg = pkgs[i];
            nodes.push({
                id: pkg.name,
                type: 'ontologyPackage',
                position: {
                    x: startX + i * (NODE_WIDTH + NODE_GAP_X),
                    y: level * (180 + NODE_GAP_Y),
                },
                data: {
                    name: pkg.name,
                    type: pkg.type,
                    version: pkg.version,
                    description: pkg.description,
                    kindCount: pkg.kindCount,
                    layerCount: pkg.layers.length,
                    layers: pkg.layers.map(l => ({ id: l.id, label: l.label, color: l.color, kindCount: l.kindCount })),
                    selected: pkg.selected,
                    onClick: () => {},  // Will be overridden
                } satisfies OntologyPackageNodeData,
            });
        }
    }

    // Create edges from extends relationships
    for (const pkg of packages) {
        if (pkg.extends && pkgByName.has(pkg.extends)) {
            edges.push({
                id: `${pkg.extends}->${pkg.name}`,
                source: pkg.extends,
                target: pkg.name,
                sourceHandle: 'bottom',
                targetHandle: 'top',
                style: { stroke: '#94A3B8', strokeWidth: 2 },
                animated: false,
                label: 'extends',
                labelStyle: { fontSize: 10, fill: '#9CA3AF' },
                labelBgStyle: { fill: '#F7F7F5', fillOpacity: 0.9 },
                labelBgPadding: [4, 2] as [number, number],
            });
        }
    }

    return { nodes, edges };
}

export function OntologyDecompositionDiagram() {
    const availableOntologies = useModelStore(s => s.availableOntologies);
    const setActiveView = useModelStore(s => s.setActiveView);
    const [showLibraryPanel, setShowLibraryPanel] = useState(false);

    const handlePackageClick = useCallback((packageName: string) => {
        setActiveView({ type: 'ontology-detail', packageName });
    }, [setActiveView]);

    const { nodes, edges } = useMemo(() => {
        const layout = layoutPackages(availableOntologies);
        // Wire up onClick handlers
        for (const node of layout.nodes) {
            const data = node.data as OntologyPackageNodeData;
            data.onClick = () => handlePackageClick(node.id);
        }
        return layout;
    }, [availableOntologies, handlePackageClick]);

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
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-3">
                <div>
                    <h2 className="text-base font-semibold" style={{ color: '#1a1a1a' }}>
                        Ontology Library
                    </h2>
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        {availableOntologies.length} package{availableOntologies.length !== 1 ? 's' : ''} available.
                        Click a package to view its layers and kinds.
                    </p>
                </div>
                <button
                    onClick={() => setShowLibraryPanel(true)}
                    className="px-3 py-1.5 text-xs rounded-lg font-medium"
                    style={{ background: '#1B3A4B', color: '#2DD4A8' }}
                >
                    + Add Ontology
                </button>
            </div>

            {/* Library management panel */}
            {showLibraryPanel && <OntologyLibraryPanel onClose={() => setShowLibraryPanel(false)} />}

            {/* ReactFlow diagram */}
            <div style={{ flex: 1, height: 'calc(100% - 72px)' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3 }}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnScroll
                    zoomOnDoubleClick={false}
                    minZoom={0.3}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#E5E5E0" gap={24} size={1} />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </div>
        </div>
    );
}

export default OntologyDecompositionDiagram;
