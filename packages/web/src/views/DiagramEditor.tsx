// ─── DiagramEditor ────────────────────────────────────────────────────────────
//
// Three-mode editor for user diagrams:
//   Visual  — ReactFlow canvas (existing DiagramCanvas)
//   Text    — SysML v2 text editor with bidirectional sync
//   Split   — side-by-side text + canvas
//
// Bidirectional sync:
//   diagram → text: client-side serialization (instant)
//   text → diagram: 800ms debounce → server-side parse via diagram:parse WS message
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useModelStore, getDiagram, getElementsByLayer } from '../store/model-store';
import { sendDiagramParse } from '../store/ws-client';
import type { DiagramDTO, MemoElement } from '@memo/core';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER } from '../constants';
import { COLOR, FONT } from '../styles/tokens';

const DiagramCanvas = lazy(() => import('./DiagramCanvas').then(m => ({ default: m.DiagramCanvas })));

// ─── SysML serializer (client-side, diagram → text) ─────────────────────────

function serializeDiagramToSysML(diagram: DiagramDTO, elements: Record<string, MemoElement>): string {
    const members = (diagram.elementIds ?? [])
        .map(id => elements[id])
        .filter(Boolean)
        .map(e => `    ${e!.construct ?? 'part'} ${e!.id} : ${e!.kind};`)
        .join('\n');

    return [
        `package '${diagram.name}' {`,
        `    // Diagram: ${diagram.diagramType.toUpperCase()} | Viewpoint: ${diagram.viewpointId}`,
        members || '    // No elements selected',
        `}`,
    ].join('\n');
}

// ─── Element membership panel (checkboxes per layer) ────────────────────────

function ElementMembershipPanel({ diagram }: { diagram: DiagramDTO }) {
    const model = useModelStore(s => s.model);
    const updateDiagramElementIds = useModelStore(s => s.updateDiagramElementIds);
    const [search, setSearch] = useState('');

    const byLayer = useMemo(() => getElementsByLayer(model), [model]);

    const toggle = useCallback((id: string) => {
        const current = new Set(diagram.elementIds ?? []);
        if (current.has(id)) current.delete(id);
        else current.add(id);
        updateDiagramElementIds(diagram.id, [...current]);
    }, [diagram.id, diagram.elementIds, updateDiagramElementIds]);

    const memberSet = useMemo(() => new Set(diagram.elementIds ?? []), [diagram.elementIds]);

    const layers = LAYER_ORDER.filter(l => byLayer.has(l));

    return (
        <div
            className="flex flex-col h-full overflow-hidden"
            style={{
                width: '220px', borderLeft: `1px solid ${COLOR.border}`,
                background: '#FAFAF8', flexShrink: 0,
            }}
        >
            <div className="px-2 py-1.5" style={{ borderBottom: `1px solid ${COLOR.border}` }}>
                <div className="font-semibold mb-1" style={{ color: COLOR.primary, fontSize: FONT.xs }}>
                    Elements ({memberSet.size} selected)
                </div>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filter…"
                    className="w-full px-2 py-1 rounded focus:outline-none"
                    style={{ background: '#F0F0ED', border: `1px solid ${COLOR.border}`, color: COLOR.primary, fontSize: FONT.xs }}
                />
            </div>
            <div className="flex-1 overflow-y-auto py-1">
                {layers.map(layer => {
                    const els = (byLayer.get(layer) ?? [])
                        .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()));
                    if (els.length === 0) return null;
                    const layerColor = LAYER_COLORS[layer] ?? COLOR.muted;
                    return (
                        <div key={layer}>
                            <div className="px-2 py-1 font-semibold" style={{ color: layerColor, fontSize: FONT.badge }}>
                                {LAYER_LABELS[layer] ?? layer}
                            </div>
                            {els.map(el => (
                                <label
                                    key={el.id}
                                    className="flex items-center gap-2 px-3 py-0.5 cursor-pointer"
                                    style={{ fontSize: FONT.xs }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#F0F0ED'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <input
                                        type="checkbox"
                                        checked={memberSet.has(el.id)}
                                        onChange={() => toggle(el.id)}
                                        style={{ accentColor: COLOR.accent }}
                                    />
                                    <span className="truncate" style={{ color: COLOR.primary }} title={el.id}>
                                        {el.name || el.id}
                                    </span>
                                </label>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main DiagramEditor component ────────────────────────────────────────────

type EditorMode = 'visual' | 'text' | 'split';

interface DiagramEditorProps {
    diagramId: string;
}

export function DiagramEditor({ diagramId }: DiagramEditorProps) {
    const model = useModelStore(s => s.model);
    const parseErrors = useModelStore(s => s.diagramParseErrors[diagramId] ?? []);
    const diagram = getDiagram(model, diagramId);

    const [mode, setMode] = useState<EditorMode>('visual');
    const [textContent, setTextContent] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const parseTimer = useRef<ReturnType<typeof setTimeout>>();

    // Sync diagram → text when we switch to a text-bearing mode or diagram changes externally
    useEffect(() => {
        if (diagram && model) {
            setTextContent(serializeDiagramToSysML(diagram, model.elements));
        }
    // Re-run when diagram id changes or when mode changes to text/split
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diagramId, mode === 'text' || mode === 'split' ? diagram?.elementIds?.join(',') : null]);

    // Clear parsing indicator when parse result arrives
    useEffect(() => {
        setIsParsing(false);
    }, [parseErrors]);

    const handleTextChange = useCallback((value: string) => {
        setTextContent(value);
        setIsParsing(true);
        clearTimeout(parseTimer.current);
        parseTimer.current = setTimeout(() => {
            sendDiagramParse(diagramId, value);
        }, 800);
    }, [diagramId]);

    if (!diagram) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: COLOR.faint, fontSize: FONT.sm }}>
                Diagram not found
            </div>
        );
    }

    const isAutoGenerated = diagram.auto;

    const textPanel = (
        <div className="flex flex-col h-full flex-1 overflow-hidden">
            <textarea
                className="flex-1 font-mono resize-none outline-none"
                style={{
                    fontSize: '12px', lineHeight: '1.6',
                    padding: '12px 14px',
                    background: '#0D1117', color: '#C9D1D9',
                    border: 'none',
                }}
                value={textContent}
                onChange={e => handleTextChange(e.target.value)}
                spellCheck={false}
                readOnly={isAutoGenerated}
                placeholder="Write SysML v2 — e.g.\npackage 'My Diagram' {\n  part pumpMechanism : PumpMechanism;\n}"
            />
            {parseErrors.length > 0 && (
                <div
                    className="px-3 py-1.5 text-xs"
                    style={{ background: '#1C0A0A', color: '#F87171', borderTop: '1px solid #3B0A0A', fontFamily: 'monospace' }}
                >
                    {parseErrors.join(' · ')}
                </div>
            )}
            {isAutoGenerated && (
                <div
                    className="px-3 py-1.5 text-xs"
                    style={{ background: '#F9F9F8', color: COLOR.faint, borderTop: `1px solid ${COLOR.border}` }}
                >
                    Auto-generated — editing disabled
                </div>
            )}
        </div>
    );

    const visualPanel = (
        <div className="flex flex-1 overflow-hidden">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center" style={{ color: COLOR.faint }}>Loading canvas…</div>}>
                <div className="flex-1 overflow-hidden">
                    <DiagramCanvas />
                </div>
            </Suspense>
            {!isAutoGenerated && <ElementMembershipPanel diagram={diagram} />}
        </div>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ── Toolbar ── */}
            <div
                className="flex items-center gap-2 px-3 py-1.5"
                style={{ borderBottom: `1px solid ${COLOR.border}`, background: '#FAFAF8', flexShrink: 0 }}
            >
                <span className="font-semibold truncate flex-1" style={{ color: COLOR.primary, fontSize: FONT.sm }}>
                    {diagram.name}
                </span>
                {isParsing && (
                    <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>Parsing…</span>
                )}
                {!isParsing && parseErrors.length > 0 && (
                    <span style={{ color: '#EF4444', fontSize: FONT.xs }}>{parseErrors.length} error{parseErrors.length > 1 ? 's' : ''}</span>
                )}
                {/* Mode switcher */}
                <div
                    className="flex overflow-hidden"
                    style={{ border: `1px solid ${COLOR.border}`, borderRadius: '6px' }}
                >
                    {([['visual', '⬜ Visual'], ['split', '⧉ Split'], ['text', '</> Text']] as [EditorMode, string][]).map(([m, label]) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            style={{
                                fontSize: FONT.xs, padding: '3px 10px', border: 'none', cursor: 'pointer',
                                background: mode === m ? COLOR.accent : 'transparent',
                                color: mode === m ? '#FFFFFF' : COLOR.secondary,
                                fontWeight: mode === m ? 600 : 400,
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">
                {mode === 'visual' && visualPanel}
                {mode === 'text' && textPanel}
                {mode === 'split' && (
                    <>
                        <div style={{ width: '50%', borderRight: `1px solid ${COLOR.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {textPanel}
                        </div>
                        <div style={{ width: '50%', display: 'flex', overflow: 'hidden' }}>
                            {visualPanel}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
