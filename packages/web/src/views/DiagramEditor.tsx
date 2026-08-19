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
//
// Disk → editor: the server reports which files each rebuild came from. When a
// change lands in this view's dependency closure — its own source, the files of
// the elements it shows, or anything those import — a clean buffer reloads
// itself and the canvas is flagged as refreshed. A dirty buffer is never
// overwritten; the user is told and chooses. Saves carry the revision they were
// based on, so a stale buffer cannot silently discard work that arrived from
// another editor, another client, or the relationship writer.
// ─────────────────────────────────────────────────────────────────────────────

import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    useModelStore, getDiagram, getElementsByLayer,
    getDiagramSourceFiles, sourceChangeAffects,
} from '../store/model-store';
import { loadDiagramSource, saveDiagramSource, sendDiagramParse, sendOpenFile } from '../store/ws-client';
import type { DiagramDTO, MemoElement } from '@memoarchitect/tools/browser';
import { LAYER_COLORS, LAYER_LABELS, LAYER_ORDER } from '../constants';
import { COLOR, FONT } from '../styles/tokens';
import { DiagramSurface } from './DiagramSurface';
import { DiagnosticsBadge } from '../components/DiagnosticsBadge';
import { Icon } from './DiagramToolbarControls';

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

// ─── Source state banners ───────────────────────────────────────────────────

/**
 * A change that arrived from outside this editor. Both variants state what
 * each action costs, because both discard something and neither is undoable
 * from here.
 */
function SourceBanner({ tone, message, actions }: {
    tone: 'notice' | 'conflict';
    message: string;
    actions: Array<{ label: string; onClick: () => void; hint: string }>;
}) {
    const conflict = tone === 'conflict';
    return (
        <div
            role="alert"
            className="flex items-center gap-2 px-3 py-1.5 flex-wrap"
            style={{
                background: conflict ? '#FEF2F2' : '#FFFBEB',
                borderBottom: `1px solid ${conflict ? '#FECACA' : '#FDE68A'}`,
                color: conflict ? '#B91C1C' : '#92400E',
                fontSize: FONT.xs,
                flexShrink: 0,
            }}
        >
            <span className="flex-1" style={{ minWidth: 180 }}>{message}</span>
            {actions.map(action => (
                <button
                    key={action.label}
                    onClick={action.onClick}
                    title={action.hint}
                    style={{
                        fontSize: FONT.xs, padding: '2px 8px', borderRadius: 5, cursor: 'pointer',
                        background: '#FFFFFF',
                        border: `1px solid ${conflict ? '#FECACA' : '#FDE68A'}`,
                        color: 'inherit', fontWeight: 600, whiteSpace: 'nowrap',
                    }}
                >
                    {action.label}
                </button>
            ))}
        </div>
    );
}

/** How long the "refreshed from source" pulse stays visible. */
const REFRESH_BADGE_MS = 4000;

/** Transient confirmation that the view re-rendered from changed source. */
function RefreshIndicator({ at }: { at: number | null }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!at) return;
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), REFRESH_BADGE_MS);
        return () => clearTimeout(timer);
    }, [at]);

    if (!visible) return null;
    return (
        <span
            title="A source file this view depends on changed; the view was rebuilt"
            style={{
                fontSize: FONT.badge, padding: '1px 6px', borderRadius: 999,
                background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', whiteSpace: 'nowrap',
            }}
        >
            ↻ Refreshed from source
        </span>
    );
}

// ─── Main DiagramEditor component ────────────────────────────────────────────

type EditorMode = 'visual' | 'text' | 'split';

// Stable empty array — avoids creating a new reference on every render
const EMPTY_ERRORS: string[] = [];

interface DiagramEditorProps {
    diagramId: string;
}

/** An on-disk change the editor has seen but not yet resolved. */
interface ExternalChange {
    /** Files in this view's closure that changed. */
    files: string[];
    at: number;
    /** True when the view's own backing file is one of them. */
    touchesOwnSource: boolean;
}

/** A save the server refused because the file had moved on. */
interface SourceConflict {
    /** The file as it now stands on disk. */
    theirs: string;
    /** Revision of that content, needed to overwrite it deliberately. */
    revision?: string;
    at: number;
}

export function DiagramEditor({ diagramId }: DiagramEditorProps) {
    const model = useModelStore(s => s.model);
    const parseErrors = useModelStore(s => s.diagramParseErrors[diagramId] ?? EMPTY_ERRORS);
    const lastSourceChange = useModelStore(s => s.lastSourceChange);
    const diagram = getDiagram(model, diagramId);

    const [mode, setMode] = useState<EditorMode>('visual');
    const [textContent, setTextContent] = useState('');
    const [isLoadingSource, setIsLoadingSource] = useState(false);
    const [isSourceReady, setIsSourceReady] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const [externalChange, setExternalChange] = useState<ExternalChange | null>(null);
    const [conflict, setConflict] = useState<SourceConflict | null>(null);
    const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
    const [saveDiagnostics, setSaveDiagnostics] = useState<string[]>([]);
    const [autoSave, setAutoSave] = useState(() => localStorage.getItem('memo.diagramEditor.autoSave') === 'true');
    const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout>>();
    const textRef = useRef('');
    const saveSequence = useRef(0);
    /** Revision the current buffer was loaded from — the basis for every save. */
    const revisionRef = useRef<string | undefined>(undefined);
    /** Discards the result of any load superseded by a newer one. */
    const loadSequence = useRef(0);
    /** Latest dirty flag, readable from effects that must not depend on it. */
    const dirtyRef = useRef(false);
    useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);

    // The visual canvas owns the bottom toolbar. Mount editing controls there
    // when it is present; Text-only mode retains the same controls as a
    // fallback bar below the editor.
    useEffect(() => {
        const findHost = () => setToolbarHost(document.getElementById('memo-diagram-editor-controls'));
        findHost();
        const observer = new MutationObserver(findHost);
        observer.observe(document.body, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);

    // Files whose change can alter what this view shows: its own source, the
    // files of the elements it displays, and everything those import.
    const sourceFiles = useMemo(
        () => getDiagramSourceFiles(model, diagramId),
        [model, diagramId]);

    /**
     * Read the backing file into the buffer, replacing whatever is there.
     *
     * A load that resolves after a newer one started — or after the user moved
     * to another diagram — is discarded rather than applied, so slow I/O can
     * never drop the wrong file's text into the editor.
     */
    const loadSource = useCallback(async (): Promise<boolean> => {
        const sequence = ++loadSequence.current;
        const requestedDiagramId = diagramId;
        setIsLoadingSource(true);
        try {
            const result = await loadDiagramSource(requestedDiagramId);
            if (loadSequence.current !== sequence) return false;
            const source = result.text ?? '';
            textRef.current = source;
            revisionRef.current = result.revision;
            setTextContent(source);
            setIsSourceReady(true);
            setIsDirty(false);
            setSaveError(null);
            setConflict(null);
            setExternalChange(null);
            return true;
        } catch (error) {
            if (loadSequence.current === sequence) {
                setSaveError(error instanceof Error ? error.message : String(error));
            }
            return false;
        } finally {
            if (loadSequence.current === sequence) setIsLoadingSource(false);
        }
    }, [diagramId]);

    // Source-derived diagrams edit their exact backing file. User-created
    // diagrams still use a generated snippet because they have no .sysml file.
    useEffect(() => {
        clearTimeout(saveTimer.current);
        setSaveError(null);
        setSavedAt(null);
        setIsDirty(false);
        setExternalChange(null);
        setConflict(null);
        setSaveDiagnostics([]);
        revisionRef.current = undefined;

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
        setIsSourceReady(false);
        void loadSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diagramId, diagram?.sourceFile]);

    // ── Disk → editor ───────────────────────────────────────────────────────
    //
    // A rebuild names the files it came from. A change inside this view's
    // closure means the canvas has already re-rendered from the new model; the
    // text buffer has to catch up too. A clean buffer reloads silently — there
    // is nothing to lose and stale text is a trap. A dirty buffer is left
    // exactly as typed and the choice is handed to the user.
    useEffect(() => {
        if (!lastSourceChange || !diagram?.sourceFile || window.__MEMO_DATA__) return;
        if (!sourceChangeAffects(lastSourceChange, sourceFiles)) return;

        setRefreshedAt(lastSourceChange.at);
        const touchesOwnSource = lastSourceChange.files.includes(diagram.sourceFile);
        if (!touchesOwnSource) return;   // closure changed, but not this file's text

        if (dirtyRef.current) {
            setExternalChange({
                files: lastSourceChange.files.filter(file => sourceFiles.includes(file)),
                at: lastSourceChange.at,
                touchesOwnSource,
            });
            return;
        }
        void loadSource();
    // Keyed on seq so a repeat change to the same file is still handled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastSourceChange?.seq]);

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
                if (!revisionRef.current) throw new Error('Reload the source before saving this edit.');
                const result = await saveDiagramSource(diagramId, text, revisionRef.current);

                if (result.conflict) {
                    setConflict({ theirs: result.text ?? '', revision: result.revision, at: Date.now() });
                    setSaveError(result.error ?? 'The file changed on disk since this edit began.');
                    return;
                }
                revisionRef.current = result.revision;
                setConflict(null);
                setExternalChange(null);
                setSaveDiagnostics(result.parseErrors ?? []);
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

    /** Discard local edits and take the file as it now stands on disk. */
    const handleTakeTheirs = useCallback(() => {
        clearTimeout(saveTimer.current);
        void loadSource();
    }, [loadSource]);

    const handleCopyDraft = useCallback(() => {
        void navigator.clipboard.writeText(textRef.current);
    }, []);

    const handleDownloadDraft = useCallback(() => {
        const blob = new Blob([textRef.current], { type: 'text/plain;charset=utf-8' });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = `${diagramId}-rejected.sysml`;
        anchor.click();
        URL.revokeObjectURL(href);
    }, [diagramId]);

    useEffect(() => {
        localStorage.setItem('memo.diagramEditor.autoSave', String(autoSave));
        clearTimeout(saveTimer.current);
        // An unresolved conflict is the user's to settle: retrying on a timer
        // would only fail again, or worse, win a race it should not.
        if (autoSave && isDirty && !isLoadingSource && !conflict) {
            saveTimer.current = setTimeout(() => void persistText(textRef.current), 800);
        }
        return () => clearTimeout(saveTimer.current);
    }, [autoSave, isDirty, isLoadingSource, textContent, persistText, conflict]);

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
            {conflict && (
                <SourceBanner
                    tone="conflict"
                    message={`${diagram.sourceFile} changed on disk. Your rejected edit remains in this buffer and was not written.`}
                    actions={[
                        { label: 'Copy draft', onClick: handleCopyDraft, hint: 'Copy the rejected SysML edit' },
                        { label: 'Download rejected edit', onClick: handleDownloadDraft, hint: 'Export the rejected SysML edit' },
                        { label: 'Reveal file', onClick: () => sendOpenFile(diagram.sourceFile!), hint: 'Open the changed source file' },
                        { label: 'Reload from disk', onClick: handleTakeTheirs, hint: 'Discard the draft and load current disk content' },
                    ]}
                />
            )}
            {!conflict && externalChange && (
                <SourceBanner
                    tone="notice"
                    message={
                        externalChange.files.length > 1
                            ? `${externalChange.files.length} source files changed on disk. Your unsaved edits are untouched.`
                            : `${externalChange.files[0]} changed on disk. Your unsaved edits are untouched.`
                    }
                    actions={[
                        { label: 'Reload from disk', onClick: handleTakeTheirs, hint: 'Discards your unsaved edits' },
                        { label: 'Keep editing', onClick: () => setExternalChange(null), hint: 'Dismiss until the next change' },
                    ]}
                />
            )}
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

    const compactDiagramTools = toolbarHost?.dataset.compactDiagramTools === 'true';
    const nextEditorMode: Record<EditorMode, EditorMode> = { visual: 'split', split: 'text', text: 'visual' };
    const editorModeLabel: Record<EditorMode, string> = { visual: 'Visual', split: 'Both', text: 'Text' };
    const editorModeIcon = mode === 'visual' ? <Icon.eye /> : mode === 'split' ? <Icon.split /> : <Icon.code />;
    const editorControls = toolbarHost ? (
        <>
            {isTextEditable && (
                <button type="button" aria-label={`Auto-save ${autoSave ? 'on' : 'off'}`} aria-pressed={autoSave} onClick={() => setAutoSave(value => !value)} title={`Auto-save ${autoSave ? 'on' : 'off'}. Click to turn it ${autoSave ? 'off' : 'on'}.`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 0, borderRadius: 5, border: `1px solid ${autoSave ? '#A7F3D0' : COLOR.border}`,
                        cursor: 'pointer', background: autoSave ? '#ECFDF5' : '#FFFFFF', color: autoSave ? '#047857' : COLOR.secondary }}>
                    <Icon.clock />
                </button>
            )}
            {isTextEditable && (
                <button aria-label="Save SysML" onClick={handleSave} disabled={!isDirty || isSaving || isLoadingSource} title="Save SysML (Ctrl/Cmd+S)"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 0, borderRadius: 5, border: `1px solid ${COLOR.border}`,
                        cursor: !isDirty || isSaving || isLoadingSource ? 'default' : 'pointer', background: isDirty ? COLOR.accent : '#F0F0ED',
                        color: isDirty ? '#FFFFFF' : COLOR.faint }}>
                    <Icon.save />
                </button>
            )}
            {compactDiagramTools ? (
                <button type="button" aria-label={`Editor mode: ${editorModeLabel[mode]}`} title={`Editor mode: ${editorModeLabel[mode]}. Click to switch to ${editorModeLabel[nextEditorMode[mode]]}.`} onClick={() => setMode(nextEditorMode[mode])}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: 5, border: `1px solid #1B3A4B`, cursor: 'pointer', background: '#1B3A4B', color: '#FFFFFF' }}>
                    {editorModeIcon}
                </button>
            ) : (
                <select aria-label="Diagram editor view" title="Choose editor view" value={mode} onChange={event => setMode(event.target.value as EditorMode)}
                    style={{ fontSize: FONT.xs, height: 28, padding: '0 6px', borderRadius: 5, border: `1px solid ${COLOR.border}`, background: '#FFFFFF', color: COLOR.primary }}>
                    <option value="visual">Visual</option>
                    <option value="split">Both</option>
                    <option value="text">Text</option>
                </select>
            )}
        </>
    ) : (
        <>
            <RefreshIndicator at={refreshedAt} />
            {isLoadingSource && <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>Loading source…</span>}
            {isSaving && <span style={{ color: COLOR.faint, fontSize: FONT.xs }}>Saving…</span>}
            {!isSaving && saveError && <span title={saveError} style={{ color: '#EF4444', fontSize: FONT.xs }}>Save failed</span>}
            {!isSaving && !saveError && isDirty && <span style={{ color: '#B45309', fontSize: FONT.xs }}>Unsaved</span>}
            {!isSaving && !isDirty && savedAt && <span style={{ color: '#15803D', fontSize: FONT.xs }}>Saved</span>}
            {/* The detail used to be a permanent monospace strip under the
                canvas — most in the way exactly when the user needed to see the
                diagram to fix it. It is a badge now, and the file:line list is
                one click away. */}
            {!isSaving && (
                <DiagnosticsBadge
                    messages={parseErrors}
                    title="This diagram's source does not parse"
                />
            )}
            <DiagnosticsBadge
                messages={saveDiagnostics}
                severity="warning"
                title="Saved, but the file does not parse — the model keeps its last good state for this file"
            />
            {isTextEditable && (
                <>
                    <label className="flex items-center gap-1" style={{ color: COLOR.secondary, fontSize: FONT.xs }} title="Save changes 800ms after typing">
                        <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} style={{ accentColor: COLOR.accent }} />
                        Auto-save
                    </label>
                    <button onClick={handleSave} disabled={!isDirty || isSaving || isLoadingSource} title="Save SysML (Ctrl/Cmd+S)"
                        style={{ fontSize: FONT.xs, padding: '3px 10px', borderRadius: '5px', border: `1px solid ${COLOR.border}`,
                            cursor: !isDirty || isSaving || isLoadingSource ? 'default' : 'pointer', background: isDirty ? COLOR.accent : '#F0F0ED',
                            color: isDirty ? '#FFFFFF' : COLOR.faint, fontWeight: 600 }}>
                        Save
                    </button>
                </>
            )}
            <label className="flex items-center gap-1" style={{ color: COLOR.secondary, fontSize: FONT.xs }}>
                View
                <select aria-label="Diagram editor view" value={mode} onChange={event => setMode(event.target.value as EditorMode)}
                    style={{ fontSize: FONT.xs, padding: '3px 8px', borderRadius: '5px', border: `1px solid ${COLOR.border}`, background: '#FFFFFF', color: COLOR.primary }}>
                    <option value="visual">Visual</option>
                    <option value="split">Both</option>
                    <option value="text">Text</option>
                </select>
            </label>
        </>
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div
                className="relative flex items-center justify-center px-3 py-2"
                style={{ borderBottom: `1px solid ${COLOR.border}`, background: '#FAFAF8', flexShrink: 0 }}
            >
                {mode !== 'visual' && (
                    <button
                        type="button"
                        onClick={() => setMode('visual')}
                        title="Return to the visual diagram"
                        className="absolute left-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold"
                        style={{ border: `1px solid ${COLOR.border}`, background: '#FFFFFF', color: COLOR.primary }}
                    >
                        <Icon.eye />
                        Return to diagram
                    </button>
                )}
                <span className="truncate" style={{ color: COLOR.primary, fontSize: FONT.md, fontWeight: 700 }}>
                    {diagram.name}
                </span>
                {mode === 'visual' && <div className="absolute right-3 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('memo:toggle-diagram-elements'))}
                        title="Show or hide Diagram Elements"
                        aria-label="Show or hide Diagram Elements"
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${COLOR.border}`, borderRadius: 5, background: '#FFFFFF', color: COLOR.secondary, cursor: 'pointer' }}
                    >
                        <Icon.elements size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('memo:toggle-diagram-toolbar'))}
                        title="Show or hide Toolbar"
                        aria-label="Show or hide Toolbar"
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${COLOR.border}`, borderRadius: 5, background: '#FFFFFF', color: COLOR.secondary, cursor: 'pointer' }}
                    >
                        <Icon.tools size={18} />
                    </button>
                </div>}
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

            {toolbarHost && createPortal(
                <div className={compactDiagramTools ? 'contents' : 'flex flex-wrap items-center gap-2'}>{editorControls}</div>,
                toolbarHost,
            )}
        </div>
    );
}
