// ─── The app's own dialogs ────────────────────────────────────────────────────
//
// Confirm, prompt and alert, drawn by the app instead of the browser. A browser
// dialog is another application's window: it cannot carry the app's look, it
// blocks the page, and it reads as a warning from the site rather than a part of
// the tool. Nothing in the app calls `window.confirm`, `window.prompt` or
// `window.alert` (a test reads the sources for them).
//
// Each function returns a promise, so a handler awaits the answer:
//
//     if (!await confirmDialog({ title: 'Delete the view?', message: '…', danger: true })) return;
//
// <AppDialogHost /> is mounted once, at the root, and shows one dialog at a time.

import { useEffect, useRef, useState } from 'react';
import { COLOR, FONT } from '../styles/tokens';

type Request =
    | { kind: 'confirm'; title: string; message?: string; confirmLabel: string; danger: boolean; resolve: (value: boolean) => void }
    | { kind: 'prompt'; title: string; message?: string; label?: string; initial: string; placeholder?: string; confirmLabel: string; resolve: (value: string | null) => void }
    | { kind: 'alert'; title: string; message?: string; resolve: () => void };

let queue: Request[] = [];
const listeners = new Set<() => void>();
const publish = () => listeners.forEach(listener => listener());

const enqueue = (request: Request) => { queue = [...queue, request]; publish(); };

export function confirmDialog(options: { title: string; message?: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
    return new Promise(resolve => enqueue({
        kind: 'confirm', title: options.title, message: options.message,
        confirmLabel: options.confirmLabel ?? (options.danger ? 'Delete' : 'OK'), danger: options.danger ?? false, resolve,
    }));
}

/** Resolves to the text entered (possibly empty), or null when cancelled. */
export function promptDialog(options: { title: string; message?: string; label?: string; initial?: string; placeholder?: string; confirmLabel?: string }): Promise<string | null> {
    return new Promise(resolve => enqueue({
        kind: 'prompt', title: options.title, message: options.message, label: options.label,
        initial: options.initial ?? '', placeholder: options.placeholder, confirmLabel: options.confirmLabel ?? 'OK', resolve,
    }));
}

export function alertDialog(message: string, title = 'Notice'): Promise<void> {
    return new Promise(resolve => enqueue({ kind: 'alert', title, message, resolve }));
}

export function AppDialogHost() {
    const [, rerender] = useState(0);
    useEffect(() => {
        const listener = () => rerender(tick => tick + 1);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }, []);
    const current = queue[0];
    if (!current) return null;
    const finish = (settle: () => void) => { queue = queue.slice(1); settle(); publish(); };
    return <DialogView key={queue.length + current.title} request={current} finish={finish} />;
}

function DialogView({ request, finish }: { request: Request; finish: (settle: () => void) => void }) {
    const [text, setText] = useState(request.kind === 'prompt' ? request.initial : '');
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

    const cancel = () => finish(() => {
        if (request.kind === 'confirm') request.resolve(false);
        else if (request.kind === 'prompt') request.resolve(null);
        else request.resolve();
    });
    const accept = () => finish(() => {
        if (request.kind === 'confirm') request.resolve(true);
        else if (request.kind === 'prompt') request.resolve(text);
        else request.resolve();
    });
    const danger = request.kind === 'confirm' && request.danger;
    const confirmLabel = request.kind === 'alert' ? 'OK' : request.confirmLabel;

    return (
        <div
            role={request.kind === 'alert' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-label={request.title}
            onKeyDown={event => { if (event.key === 'Escape') cancel(); }}
            onMouseDown={event => { if (event.target === event.currentTarget) cancel(); }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <form
                onSubmit={event => { event.preventDefault(); accept(); }}
                style={{
                    width: '420px', maxWidth: '92vw', display: 'grid', gap: '12px', padding: '18px 20px', borderRadius: '12px',
                    background: COLOR.surface, border: `1px solid ${COLOR.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', color: COLOR.primary,
                }}
            >
                <div style={{ fontWeight: 700, fontSize: FONT.lg }}>{request.title}</div>
                {request.message && <div style={{ fontSize: FONT.sm, color: COLOR.muted, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{request.message}</div>}
                {request.kind === 'prompt' && (
                    <label style={{ display: 'grid', gap: '4px' }}>
                        {request.label && <span style={{ fontSize: FONT.xs, fontWeight: 600, color: COLOR.secondary }}>{request.label}</span>}
                        <input
                            ref={inputRef} value={text} onChange={event => setText(event.target.value)} placeholder={request.placeholder} aria-label={request.label ?? request.title}
                            style={{ padding: '7px 9px', border: `1px solid ${COLOR.border}`, borderRadius: '7px', fontSize: FONT.sm, color: COLOR.primary, boxSizing: 'border-box', width: '100%' }}
                        />
                    </label>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {request.kind !== 'alert' && (
                        <button type="button" onClick={cancel} style={{ padding: '7px 14px', borderRadius: '7px', border: `1px solid ${COLOR.border}`, background: COLOR.surface, cursor: 'pointer', fontSize: FONT.sm }}>Cancel</button>
                    )}
                    <button
                        type="submit" autoFocus={request.kind !== 'prompt'}
                        style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: FONT.sm, fontWeight: 600, cursor: 'pointer', background: danger ? '#B91C1C' : COLOR.accent, color: '#fff' }}
                    >{confirmLabel}</button>
                </div>
            </form>
        </div>
    );
}

/** A one-line question and a text box: a question with an initial value, answered in a text box. */
export const askText = (question: string, initial = ''): Promise<string | null> => promptDialog({ title: question, initial });

/**
 * A yes/no question from one string: the first line is the title, the rest the message.
 * `danger` paints the button red and labels it Delete.
 */
export function askConfirm(text: string, danger = false): Promise<boolean> {
    const [title, ...rest] = text.split('\n');
    const message = rest.join('\n').trim();
    return confirmDialog({ title: title.trim(), ...(message ? { message } : {}), danger });
}
