// ─── Walking through a flow ───────────────────────────────────────────────────
//
// One hop at a time through an authored action flow: the step you are on is ringed, the steps walked are numbered
// on the canvas, and at a decision you choose the way on. It can play by itself, list what each step checks, be
// linked to at the exact step and branches, and be recorded. The canvas does the dimming; this holds the walk.
//
// Playing, the checks and recording follow Act's flow player; see lib/edge-token.ts for its notice.
//
// Adapted from StepWalkthrough.tsx and WalkthroughBadges.tsx in EventCatalog's packages/visualiser
// (https://github.com/event-catalog/eventcatalog), under this licence:
//
// MIT License
//
// Copyright (c) 2022-2026 boyney123
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of
// the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, ViewportPortal, useInternalNode } from '@xyflow/react';
import { useSearchParams } from 'react-router-dom';
import type { MemoModelDTO } from '@memoarchitect/tools/browser';
import {
    autoStep, canStopHere, conditionStates, holdMs, itemsAt, stepConditions, walkFromParam, walkLength, walkStart, walkToParam, waysOn,
    type WalkConditionState, type WalkEdge, type WalkNode, type WalkStop,
} from '../lib/flow-walkthrough';
import { travelAlongEdge } from '../lib/edge-token';
import { canRecordTab, recordTab, type TabRecording } from '../lib/record-tab';
import { COLOR, FONT } from '../styles/tokens';

export const WALK_CURRENT_CLASS = 'memo-walk-current';
export const WALK_LANE_CLASS = 'memo-walk-lane';
const WALK_PARAM = 'walk';
const SPEEDS = [0.5, 1, 1.5, 2];
const RECORDING_TAIL_MS = 1200;
/** The diagram being walked in this page. An address carries its walk along when the reader moves to another diagram. */
let walkedDiagram: string | null = null;

const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const CHECK_MARK: Record<WalkConditionState, { mark: string; color: string; label: string }> = {
    open: { mark: '▲', color: COLOR.muted, label: 'To hold' },
    held: { mark: '✓', color: '#15803D', label: 'Held' },
    failed: { mark: '✕', color: '#B91C1C', label: 'Failed' },
    unchecked: { mark: '–', color: COLOR.muted, label: 'Not reached' },
};

const BUTTON = { border: `1px solid ${COLOR.border}`, borderRadius: 6, padding: '3px 10px', fontSize: FONT.xs, fontWeight: 600, cursor: 'pointer', background: COLOR.surface, color: COLOR.primary };
const PRIMARY = { ...BUTTON, background: COLOR.accent, color: COLOR.accentDark, border: `1px solid ${COLOR.accent}` };

const BADGE_SIZE = 24;

const Badge = memo(function Badge({ nodeId, number, current }: { nodeId: string; number: number; current: boolean }) {
    const node = useInternalNode(nodeId);
    if (!node) return null;
    const { x, y } = node.internals.positionAbsolute;
    return (
        <div style={{
            position: 'absolute', transform: `translate(${x - BADGE_SIZE / 2}px, ${y - BADGE_SIZE / 2}px)`,
            width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: '50%', background: COLOR.accent, color: COLOR.accentDark,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
            opacity: current ? 1 : 0.85, zIndex: 2000, pointerEvents: 'none',
        }}>{number}</div>
    );
});

/** A step walked more than once shows when it was last walked. */
function Badges({ trail }: { trail: readonly string[] }) {
    const last = new Map(trail.map((id, index) => [id, index]));
    return (
        <ViewportPortal>
            {[...last].map(([id, index]) => <Badge key={id} nodeId={id} number={index + 1} current={index === trail.length - 1} />)}
        </ViewportPortal>
    );
}

export function FlowWalkthrough({ diagramId, nodes, edges, model, onStep, title }: {
    diagramId: string;
    nodes: readonly WalkNode[];
    edges: readonly WalkEdge[];
    model: MemoModelDTO | null;
    /** The steps walked so far, ending with the current one; empty when the walk ends. */
    onStep: (trail: string[]) => void;
    /** Names a recording. */
    title: string;
}) {
    const [trail, setTrail] = useState<string[]>([]);
    const [choice, setChoice] = useState(0);
    const [stop, setStop] = useState<WalkStop | null>(null);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [recording, setRecording] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [restored, setRestored] = useState(false);
    const [params, setParams] = useSearchParams();
    const recordingRef = useRef<TabRecording | null>(null);
    // Only a walk started here writes the address: while the reader moves to another diagram, it still names the old one.
    const walkedHere = useRef(false);
    const current = trail[trail.length - 1];
    const startId = useMemo(() => walkStart(nodes, edges), [nodes, edges]);
    const paths = useMemo(() => (current ? waysOn(current, edges) : []), [current, edges]);
    const conditions = useMemo(() => (current ? stepConditions(model, current) : []), [current, model]);
    const stoppable = canStopHere(paths);
    const options = paths.length + (stoppable ? 1 : 0);
    const decision = options > 1 || stoppable;

    const goTo = useCallback((next: string[], nextStop: WalkStop | null = null) => {
        setTrail(next);
        setChoice(0);
        setStop(nextStop);
        walkedDiagram = next.length > 0 ? diagramId : null;
        if (next.length > 0) walkedHere.current = true;
        onStep(next);
    }, [onStep, diagramId]);
    const start = useCallback(() => { setPlaying(false); if (startId) goTo([startId]); }, [startId, goTo]);
    const stopRecording = useCallback(() => {
        const active = recordingRef.current;
        recordingRef.current = null;
        setRecording(false);
        return active?.stop();
    }, []);
    const finish = useCallback(() => { setPlaying(false); void stopRecording(); goTo([]); }, [goTo, stopRecording]);
    const back = useCallback(() => {
        setPlaying(false);
        if (stop) setStop(null);
        else goTo(trail.slice(0, -1));
    }, [stop, goTo, trail]);
    const next = useCallback((index = choice) => {
        if (index === paths.length && stoppable) { setStop({ kind: 'guards' }); return; }
        const path = paths[index];
        if (!path) return;
        void travelAlongEdge(path.edgeId, speed, { cancelled: false });
        goTo([...trail, path.targetId]);
        if (recordingRef.current) setPlaying(true);
    }, [choice, paths, stoppable, goTo, trail, speed]);
    const togglePlay = useCallback(() => {
        if (playing) { setPlaying(false); return; }
        if (stop) return;
        if (paths.length === 0) { start(); setPlaying(true); return; }
        if (decision) next();
        setPlaying(true);
    }, [playing, stop, paths.length, decision, start, next]);
    const failCheck = useCallback((index: number) => { setPlaying(false); setStop({ kind: 'check', index }); }, []);

    // Opened from a link: walk to where it points.
    useEffect(() => {
        if (restored || !startId) return;
        setRestored(true);
        const param = params.get(WALK_PARAM);
        if (!param || (walkedDiagram !== null && walkedDiagram !== diagramId)) return;
        const walk = walkFromParam(param, startId, edges);
        const checks = stepConditions(model, walk.trail[walk.trail.length - 1]).length;
        goTo(walk.trail, walk.stop?.kind === 'check' && walk.stop.index >= checks ? null : walk.stop);
    }, [restored, startId, params, edges, model, goTo, diagramId]);

    // The address follows the walk, so a copy of it opens this exact path.
    const walkParam = trail.length > 0 ? walkToParam(trail, stop, edges) : null;
    useEffect(() => {
        if (!restored || !walkedHere.current || params.get(WALK_PARAM) === walkParam) return;
        setParams(existing => {
            const updated = new URLSearchParams(existing);
            if (walkParam) updated.set(WALK_PARAM, walkParam); else updated.delete(WALK_PARAM);
            return updated;
        }, { replace: true });
    }, [restored, params, walkParam, setParams]);

    // The step no longer exists, as when a composite is folded: start again.
    useEffect(() => {
        if (current && !nodes.some(node => node.id === current)) { setPlaying(false); goTo([]); }
    }, [current, nodes, goTo]);

    const element = current ? model?.elements[current] : undefined;
    const { receives, sends } = current ? itemsAt(current, edges) : { receives: [], sends: [] };
    const caption = [element?.name, element?.doc, ...conditions.map(c => c.text), ...receives, ...sends].filter(Boolean).join(' ');

    // Playing: hold the step long enough to read it, send the token along the way on, then arrive. A decision waits
    // for the reader, and a loop does not go round for ever.
    useEffect(() => {
        if (!playing || !current || stop) return;
        const path = autoStep(trail, paths);
        if (!path) { setPlaying(false); return; }
        const signal = { cancelled: false };
        const timer = setTimeout(() => {
            void travelAlongEdge(path.edgeId, speed, signal).then(() => {
                if (!signal.cancelled) goTo([...trail, path.targetId]);
            });
        }, holdMs(caption, speed));
        return () => { signal.cancelled = true; clearTimeout(timer); };
    }, [playing, current, stop, trail, paths, speed, caption, goTo]);

    // A recording ends with the walk, once its last step has been seen.
    useEffect(() => {
        if (!recording || !current || !(stop || paths.length === 0)) return;
        const timer = setTimeout(() => { void stopRecording(); }, RECORDING_TAIL_MS);
        return () => clearTimeout(timer);
    }, [recording, current, stop, paths.length, stopRecording]);
    useEffect(() => () => { void recordingRef.current?.stop(); }, []);

    const record = useCallback(async () => {
        setNotice(null);
        const active = await recordTab(title, () => { void stopRecording(); });
        if (!active) { setNotice('This browser did not allow recording the tab.'); return; }
        recordingRef.current = active;
        setRecording(true);
        start();
        setPlaying(true);
    }, [title, stopRecording, start]);

    const copyLink = useCallback(() => {
        void navigator.clipboard?.writeText(window.location.href).then(
            () => setNotice('Link copied.'),
            () => setNotice('Could not copy the link.'),
        );
    }, []);
    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), 2500);
        return () => clearTimeout(timer);
    }, [notice]);

    useEffect(() => {
        if (trail.length === 0) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
            if (event.key === 'ArrowRight') { if (!stop) { setPlaying(false); next(); } }
            else if (event.key === 'ArrowLeft') back();
            else if (event.key === 'Escape') finish();
            else if (event.key === ' ') togglePlay();
            else if (/^[1-9]$/.test(event.key) && options > 1 && Number(event.key) <= options && !stop) next(Number(event.key) - 1);
            else return;
            event.preventDefault();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [trail.length, stop, options, next, back, finish, togglePlay]);

    if (!startId) return null;
    const card = { background: COLOR.surface, border: `1px solid ${COLOR.border}`, borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.14)' };
    if (trail.length === 0) {
        return <Panel position="bottom-center"><button type="button" data-testid="walk-start" onClick={start} style={BUTTON}>▶ Walk through</button></Panel>;
    }
    const nameOf = (id: string) => {
        const data = nodes.find(node => node.id === id)?.data;
        return model?.elements[id]?.name ?? (typeof data?.label === 'string' ? data.label : id);
    };
    const total = walkLength(trail, edges);
    const failed = stop?.kind === 'check' ? stop.index : undefined;
    const states = conditionStates(conditions.length, failed);
    return (
        <>
            <Badges trail={trail} />
            <Panel position="bottom-center">
                <div data-testid="walk-card" style={{ ...card, width: 400 }} onMouseDown={event => { if ((event.target as HTMLElement).closest('button')) event.preventDefault(); }}>
                    <div style={{ height: 2, background: COLOR.borderLight }}><div style={{ height: '100%', width: `${(trail.length / total) * 100}%`, background: COLOR.accent, transition: 'width 300ms' }} /></div>
                    <div style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: FONT.xs, color: COLOR.muted, fontVariantNumeric: 'tabular-nums' }}>{trail.length}/{total}</span>
                            <b style={{ flex: 1, minWidth: 0, fontSize: FONT.sm, color: COLOR.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nameOf(current)}>{nameOf(current)}</b>
                            <button type="button" aria-label="Stop the walkthrough" title="Stop (Esc)" onClick={finish} style={{ border: 'none', background: 'none', cursor: 'pointer', color: COLOR.muted }}>×</button>
                        </div>
                        {element?.doc && <p style={{ margin: '4px 0 0', fontSize: FONT.xs, color: COLOR.secondary, maxHeight: 64, overflowY: 'auto' }}>{element.doc}</p>}
                        {conditions.length > 0 && (
                            <ul aria-label="What this step checks" style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, fontSize: FONT.xs, maxHeight: 96, overflowY: 'auto' }}>
                                {conditions.map((condition, index) => {
                                    const state = CHECK_MARK[states[index]];
                                    return (
                                        <li key={condition.key} className="memo-walk-check" data-state={states[index]} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '1px 0', opacity: states[index] === 'unchecked' ? 0.55 : 1 }}>
                                            <span role="img" aria-label={state.label} title={state.label} style={{ color: state.color, width: 12, flex: 'none', textAlign: 'center' }}>{state.mark}</span>
                                            <span style={{ flex: 1, minWidth: 0, color: COLOR.secondary }}>{condition.text}</span>
                                            <span style={{ color: COLOR.muted, flex: 'none' }}>{condition.when}</span>
                                            {!stop && <button type="button" onClick={() => failCheck(index)} title="See where the flow goes if this does not hold" style={{ ...BUTTON, padding: '0 6px', fontWeight: 500, flex: 'none' }}>Fails</button>}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {(receives.length > 0 || sends.length > 0) && (
                            <div style={{ marginTop: 4, fontSize: FONT.xs, color: COLOR.muted }}>
                                {receives.length > 0 && <div>Receives {receives.join(', ')}</div>}
                                {sends.length > 0 && <div>Sends {sends.join(', ')}</div>}
                            </div>
                        )}
                        {stop && <p role="status" style={{ margin: '4px 0 0', fontSize: FONT.xs, fontWeight: 600, color: '#B91C1C' }}>The flow stops here: {stop.kind === 'guards' ? 'none of its guards holds' : `${conditions[stop.index]?.text ?? 'a check'} does not hold`}.</p>}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                            <button type="button" onClick={back} disabled={trail.length === 1 && !stop} title="Back (←)" style={BUTTON}>Back</button>
                            {stop || paths.length === 0 ? (
                                <span style={{ display: 'flex', gap: 4 }}>
                                    <button type="button" onClick={start} style={BUTTON}>Restart</button>
                                    <button type="button" onClick={finish} style={PRIMARY}>Finish</button>
                                </span>
                            ) : (
                                <span style={{ display: 'flex', gap: 4, minWidth: 0, flex: 1, justifyContent: 'flex-end' }}>
                                    {options > 1 && (
                                        <select aria-label="Which way the flow goes next" value={choice} onChange={event => setChoice(Number(event.target.value))} style={{ minWidth: 0, flex: 1, fontSize: FONT.xs }}>
                                            {paths.map((path, index) => <option key={path.edgeId} value={index}>{index + 1}. {path.label ? `${path.label} → ` : ''}{nameOf(path.targetId)}</option>)}
                                            {stoppable && <option value={paths.length}>{paths.length + 1}. None of these holds</option>}
                                        </select>
                                    )}
                                    <button type="button" onClick={() => next()} title="Next (→)" style={PRIMARY}>Next</button>
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                            <button type="button" data-testid="walk-play" onClick={togglePlay} disabled={Boolean(stop)} title={playing ? 'Pause (space)' : decision ? 'Take this way and play on (space)' : 'Play (space)'} style={BUTTON}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
                            <select aria-label="Playing speed" value={speed} onChange={event => setSpeed(Number(event.target.value))} style={{ fontSize: FONT.xs }}>
                                {SPEEDS.map(value => <option key={value} value={value}>{value}×</option>)}
                            </select>
                            <span role="status" style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: FONT.xs, color: COLOR.muted }}>{notice ?? (recording ? 'Recording…' : '')}</span>
                            <button type="button" data-testid="walk-link" onClick={copyLink} title="Copy a link to this exact walk" style={BUTTON}>Copy link</button>
                            {canRecordTab() && (recording
                                ? <button type="button" data-testid="walk-record-stop" onClick={() => { setPlaying(false); void stopRecording(); }} style={{ ...BUTTON, color: '#B91C1C' }}>■ Stop</button>
                                : <button type="button" data-testid="walk-record" onClick={() => { void record(); }} title="Play from the start and save a video of this tab" style={BUTTON}>● Record</button>)}
                        </div>
                    </div>
                </div>
            </Panel>
        </>
    );
}
