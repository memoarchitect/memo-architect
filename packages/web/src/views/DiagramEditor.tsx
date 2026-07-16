// ─── DiagramEditor ────────────────────────────────────────────────────────────
//
// Three-mode editor for user diagrams:
//   Visual  — diagram canvas via the active renderer provider (DiagramSurface)
//   Text    — SysML v2 text editor with bidirectional sync
//   Split   — side-by-side text + canvas
//
// Bidirectional sync:
//   diagram → text: exact source-file load (or serialization for user diagrams)
//   text → diagram: explicit Save (or optional 800ms auto-save) → source file → hot rebuild
// ─────────────────────────────────────────────────────────────────────────────

import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useModelStore, getDiagram, getElementsByLayer } from '../store/model-store';
import { loadDiagramSource, saveDiagramSource, sendDiagramParse } from '../store/ws-client';
import type { DiagramDTO, MemoElement } from '@memo/tools/browser';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER } from '../constants';
import { COLOR, FONT } from '../styles/tokens';
import { DiagramSurface } from './DiagramSurface';

const SysmlCodeEditor = lazy(() => import('../components/SysmlCodeEditor').then(module => ({ default: module.SysmlCodeEditor })));

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

// Stable empty array — avoids creating a new reference on every render
const EMPTY_ERRORS: string[] = [];

interface DiagramEditorProps {
    diagramId: string;
}

export function DiagramEditor({ diagramId }: DiagramEditorProps) {
    const model = useModelStore(s => s.model);
    const parseErrors = useModelStore(s => s.diagramParseErrors[diagramId] ?? EMPTY_ERRORS);
    const diagram = getDiagram(model, diagramId);

    const [mode, setMode] = useState<EditorMode>('visual');
    const [textContent, setTextContent] = useState('');
    const [isLoadingSource, setIsLoadingSource] = useState(false);
    const [isSourceReady, setIsSourceReady] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const [autoSave, setAutoSave] = useState(() => localStorage.getItem('memo.diagramEditor.autoSave') === 'true');
    const saveTimer = useRef<ReturnType<typeof setTimeout>>();
    const textRef = useRef('');
    const saveSequence = useRef(0);

    // Source-derived diagrams edit their exact backing file. User-created
    // diagrams still use a generated snippet because they have no .sysml file.
    useEffect(() => {
        let cancelled = false;
        clearTimeout(saveTimer.current);
        setSaveError(null);
        setSavedAt(null);
        setIsDirty(false);

        if (!diagram || !model) return;
        if (!diagram.sourceFile || window.__MEMO_DATA__) {
            const generated = serializeDiagramToSysML(diagram, model.elements);
            textRef.current = generated;
            setTextContent(generated);
            setIsLoadingSource(false);
            setIsSourceReady(false);
            return;
        }

        setTextContent('');
        textRef.current = '';
        setIsLoadingSource(true);
        setIsSourceReady(false);
        loadDiagramSource(diagramId)
            .then(result => {
                if (cancelled) return;
                const source = result.text ?? '';
                textRef.current = source;
                setTextContent(source);
                setIsSourceReady(true);
            })
            .catch(error => {
                if (!cancelled) setSaveError(error instanceof Error ? error.message : String(error));
            })
            .finally(() => {
                if (!cancelled) setIsLoadingSource(false);
            });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diagramId, diagram?.sourceFile]);

    const handleTextChange = (value: string) => {
        textRef.current = value;
        setTextContent(value);
        setIsDirty(true);
        setSaveError(null);
    };

    const persistText = useCallback(async (text: string) => {
        if (!diagram) return;
        const sequence = ++saveSequence.current;
        setIsSaving(true);
        setSaveError(null);
        try {
            if (diagram.sourceFile) {
                await saveDiagramSource(diagramId, text);
            } else {
                // User-created diagrams persist their selected element IDs.
                sendDiagramParse(diagramId, text);
            }
            if (textRef.current === text) setIsDirty(false);
            setSavedAt(Date.now());
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : String(error));
        } finally {
            if (saveSequence.current === sequence) setIsSaving(false);
        }
    }, [diagram, diagramId]);

    useEffect(() => {
        localStorage.setItem('memo.diagramEditor.autoSave', String(autoSave));
        clearTimeout(saveTimer.current);
        if (autoSave && isDirty && !isLoadingSource) {
            saveTimer.current = setTimeout(() => void persistText(textRef.current), 800);
        }
        return () => clearTimeout(saveTimer.current);
    }, [autoSave, isDirty, isLoadingSource, textContent, persistText]);

    const handleSave = useCallback(() => {
        clearTimeout(saveTimer.current);
        void persistText(textRef.current);
    }, [persistText]);

    const completionSymbols = useMemo(() => Object.values(model?.elements ?? {}).map(element => ({
        id: element.id,
        name: element.name,
        kind: element.kind,
    })), [model?.elements]);

    if (!diagram) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: COLOR.faint, fontSize: FONT.sm }}>
                Diagram not found
            </div>
        );
    }

    const isAutoGenerated = diagram.auto;
    const isTextEditable = !isAutoGenerated || (Boolean(diagram.sourceFile) && isSourceReady);

    const textPanel = (
        <div className="flex flex-col h-full flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden" style={{ background: '#1E1E1E' }}>
                <Suspense fallback={<div className="h-full flex items-center justify-center" style={{ color: '#9CA3AF', fontSize: FONT.xs }}>Loading SysML editor…</div>}>
                    <SysmlCodeEditor
                        value={textContent}
                        sourceFile={diagram.sourceFile}
                        readOnly={!isTextEditable || isLoadingSource}
                        symbols={completionSymbols}
                        onChange={handleTextChange}
                        onSave={() => { if (isTextEditable && isDirty) handleSave(); }}
                    />
                </Suspense>
            </div>
            {parseErrors.length > 0 && (
                <div
                    className="px-3 py-1.5 text-xs"
                    style={{ background: '#1C0A0A', color: '#F87171', borderTop: '1px solid #3B0A0A', fontFamily: 'monospace' }}
                >
                    {parseErrors.join(' · ')}
                </div>
            )}
            {saveError && (
                <div
                    className="px-3 py-1.5 text-xs"
                    style={{ background: '#1C0A0A', color: '#FCA5A5', borderTop: '1px solid #3B0A0A' }}
                >
                    {saveError}
                </div>
            )}
            {!isTextEditable && (
                <div
                    className="px-3 py-1.5 text-xs"
                    style={{ background: '#F9F9F8', color: COLOR.faint, borderTop: `1px solid ${COLOR.border}` }}
                >
                    {diagram.sourceFile && window.__MEMO_DATA__
                        ? 'Static build — run memo-architect dev to edit the SysML source'
                        : diagram.sourceFile
                            ? 'The SysML source could not be loaded'
                            : 'Generated model view — no editable SysML source file'}
                </div>
            )}
        </div>
    );

    const visualPanel = (
        <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
                <DiagramSurface />
            </div>
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
                {diagram.sourceFile && (
                    <span className="truncate" title={diagram.sourceFile} style={{ maxWidth: '220px', color: COLOR.faint, fontSize: FONT.xs }}>
                        {diagram.sourceFile}
                    </span>
                )}
                {(mode === 'text' || mode === 'split') && (
                    <span title="Local, public Monaco editor with SysML highlighting and model-aware completion" style={{ color: '#4B6E80', fontSize: FONT.badge }}>
                        Monaco · SysML
                    </span>
                )}
                {isLoadingSource && <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>Loading source…</span>}
                {isSaving && <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>Saving…</span>}
                {!isSaving && saveError && <span title={saveError} style={{ color: '#EF4444', fontSize: FONT.xs }}>Save failed</span>}
                {!isSaving && !saveError && isDirty && <span style={{ color: '#B45309', fontSize: FONT.xs }}>Unsaved</span>}
                {!isSaving && !isDirty && savedAt && <span style={{ color: '#15803D', fontSize: FONT.xs }}>Saved</span>}
                {!isSaving && parseErrors.length > 0 && (
                    <span style={{ color: '#EF4444', fontSize: FONT.xs }}>{parseErrors.length} error{parseErrors.length > 1 ? 's' : ''}</span>
                )}
                {isTextEditable && (
                    <>
                        <label className="flex items-center gap-1" style={{ color: COLOR.secondary, fontSize: FONT.xs }} title="Save changes 800ms after typing">
                            <input
                                type="checkbox"
                                checked={autoSave}
                                onChange={e => setAutoSave(e.target.checked)}
                                style={{ accentColor: COLOR.accent }}
                            />
                            Auto-save
                        </label>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty || isSaving || isLoadingSource}
                            title="Save SysML (Ctrl/Cmd+S)"
                            style={{
                                fontSize: FONT.xs, padding: '3px 10px', borderRadius: '5px',
                                border: `1px solid ${COLOR.border}`,
                                cursor: !isDirty || isSaving || isLoadingSource ? 'default' : 'pointer',
                                background: isDirty ? COLOR.accent : '#F0F0ED',
                                color: isDirty ? '#FFFFFF' : COLOR.faint,
                                fontWeight: 600,
                            }}
                        >
                            Save
                        </button>
                    </>
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
