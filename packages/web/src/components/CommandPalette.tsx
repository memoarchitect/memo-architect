import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useModelStore, type ActiveView } from '../store/model-store';
import { LAYER_COLORS, DIAGRAM_TYPE_META } from '../constants';
import { FONT } from '../styles/tokens';
import type { MemoElement, DiagramDTO } from '@memo/tools/browser';

interface PaletteItem {
    id: string;
    label: string;
    sublabel?: string;
    kind: 'element' | 'diagram' | 'tool' | 'viewpoint';
    color?: string;
    action: () => void;
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const model = useModelStore(s => s.model);
    const selectElement = useModelStore(s => s.selectElement);
    const setActiveView = useModelStore(s => s.setActiveView);
    const selectViewpoint = useModelStore(s => s.selectViewpoint);
    const setExplorerTab = useModelStore(s => s.setExplorerTab);

    // Cmd+K / Ctrl+K handler
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
                setQuery('');
                setSelectedIdx(0);
            }
            if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    // Focus input when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    // Build searchable items
    const items = useMemo((): PaletteItem[] => {
        const result: PaletteItem[] = [];

        // Tools
        result.push(
            { id: 'tool:dsm', label: 'DSM', sublabel: 'Design Structure Matrix', kind: 'tool', action: () => setActiveView({ type: 'dsm' }) },
            { id: 'tool:traceability', label: 'Traceability Matrix', sublabel: 'N\u00d7N trace matrix with presets', kind: 'tool', action: () => setActiveView({ type: 'traceability' }) },
            { id: 'tool:ontology', label: 'Ontology', sublabel: 'Ontology Viewer', kind: 'tool', action: () => setActiveView({ type: 'ontology' }) },
        );

        if (!model) return result;

        // Diagrams
        for (const diag of model.diagrams ?? []) {
            const meta = DIAGRAM_TYPE_META[diag.diagramType];
            result.push({
                id: `diag:${diag.id}`,
                label: diag.name,
                sublabel: meta?.fullName || diag.diagramType,
                kind: 'diagram',
                color: meta?.color,
                action: () => {
                    setActiveView({ type: 'diagram', diagramId: diag.id });
                    selectViewpoint(diag.viewpointId === '__model' ? null : diag.viewpointId);
                    setExplorerTab('views');
                },
            });
        }

        // Viewpoints
        for (const vp of model.viewpoints ?? []) {
            result.push({
                id: `vp:${vp.id}`,
                label: vp.label,
                sublabel: 'Viewpoint',
                kind: 'viewpoint',
                action: () => {
                    selectViewpoint(vp.id);
                    setExplorerTab('views');
                },
            });
        }

        // Elements
        for (const el of Object.values(model.elements)) {
            result.push({
                id: `el:${el.id}`,
                label: el.name,
                sublabel: `${el.kind} \u00b7 ${el.layer}`,
                kind: 'element',
                color: LAYER_COLORS[el.layer],
                action: () => {
                    selectElement(el.id);
                    setExplorerTab('model');
                },
            });
        }

        return result;
    }, [model, setActiveView, selectElement, selectViewpoint, setExplorerTab]);

    // Filter
    const filtered = useMemo(() => {
        if (!query) return items.slice(0, 20);
        const lower = query.toLowerCase();
        return items
            .filter(item => item.label.toLowerCase().includes(lower) || (item.sublabel?.toLowerCase().includes(lower)))
            .slice(0, 20);
    }, [items, query]);

    // Reset selection on filter change
    useEffect(() => { setSelectedIdx(0); }, [filtered]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && filtered[selectedIdx]) {
            filtered[selectedIdx].action();
            setOpen(false);
        }
    }, [filtered, selectedIdx]);

    if (!open) return null;

    const kindIcon: Record<string, string> = {
        element: '\u25CB',
        diagram: '\u25A6',
        tool: '\u2699',
        viewpoint: '\u25C9',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-24"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
        >
            <div
                className="rounded-xl overflow-hidden"
                style={{ width: '520px', maxHeight: '400px', background: '#FFFFFF', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #E5E5E0' }}>
                    <span style={{ color: '#9CA3AF', fontSize: '14px' }}>{'\u2315'}</span>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search elements, diagrams, tools..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 text-sm focus:outline-none"
                        style={{ color: '#1a1a1a', background: 'transparent' }}
                    />
                    <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#F0F0ED', color: '#9CA3AF', fontSize: '10px' }}>ESC</kbd>
                </div>

                {/* Results */}
                <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
                    {filtered.length === 0 && (
                        <div className="px-4 py-6 text-center text-xs" style={{ color: '#9CA3AF' }}>
                            No results found
                        </div>
                    )}
                    {filtered.map((item, idx) => (
                        <div
                            key={item.id}
                            className="flex items-center gap-2 px-4 py-2 cursor-pointer"
                            style={{
                                background: idx === selectedIdx ? '#F0F0ED' : 'transparent',
                            }}
                            onMouseEnter={() => setSelectedIdx(idx)}
                            onClick={() => { item.action(); setOpen(false); }}
                        >
                            <span style={{ color: item.color || '#9CA3AF', fontSize: '12px' }}>
                                {kindIcon[item.kind] || '\u25CB'}
                            </span>
                            <span className="text-sm truncate" style={{ color: '#1a1a1a' }}>{item.label}</span>
                            {item.sublabel && (
                                <span className="text-xs truncate ml-auto" style={{ color: '#9CA3AF' }}>{item.sublabel}</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 flex items-center gap-3" style={{ borderTop: '1px solid #E5E5E0', background: '#FAFAF8' }}>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                        {'\u2191\u2193'} navigate &middot; {'\u21B5'} select &middot; esc close
                    </span>
                </div>
            </div>
        </div>
    );
}
