// ─── Diagnostics badge ───────────────────────────────────────────────────────
//
// A red dot with a count, and the detail one click away.
//
// The diagram editor used to print its parse errors as a full-width monospace
// strip under the canvas, permanently, for as long as the file did not
// compile. That is the wrong shape for the information twice over: it takes
// space from the diagram the whole time, and it takes the most space exactly
// when the user most needs to see the diagram in order to fix it.
//
// Same reading as StaleSceneNotice, which is the project-wide version of this:
// say that something is wrong and how much, and let whoever wants the file and
// line ask for it.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

export interface DiagnosticsBadgeProps {
    /** One line per diagnostic. Empty renders nothing at all. */
    messages: readonly string[];
    /** 'error' is a file that does not compile; 'warning' is one that saved anyway. */
    severity?: 'error' | 'warning';
    /** What the panel says above the list. */
    title: string;
}

const TONE = {
    error: { badge: '#7F1D1D', border: '#EF4444', text: '#FEE2E2', mark: '#FCA5A5' },
    warning: { badge: '#78350F', border: '#F59E0B', text: '#FEF3C7', mark: '#FCD34D' },
};

export function DiagnosticsBadge({ messages, severity = 'error', title }: DiagnosticsBadgeProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const tone = TONE[severity];

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (containerRef.current?.contains(event.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    // A badge with nothing behind it is a red mark that cannot be dismissed or
    // explained, which is worse than no badge at all.
    if (messages.length === 0) return null;

    const label = `${messages.length} ${severity}${messages.length === 1 ? '' : 's'} — click for detail`;

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
                type="button"
                role="status"
                aria-live="polite"
                aria-expanded={open}
                aria-label={label}
                title={label}
                onClick={() => setOpen(value => !value)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: tone.badge, border: `1px solid ${tone.border}`, borderRadius: 999,
                    padding: '2px 9px', color: tone.text, cursor: 'pointer',
                    fontSize: '11px', fontWeight: 700, lineHeight: 1.6,
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke={tone.mark} strokeWidth="2" />
                    <path d="M12 7v6" stroke={tone.mark} strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="16.5" r="1.1" fill={tone.mark} />
                </svg>
                {messages.length}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label={title}
                    style={{
                        position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, zIndex: 9100,
                        width: 'min(560px, calc(100vw - 48px))', maxHeight: '40vh', overflowY: 'auto',
                        background: '#1E293B', border: `1px solid ${tone.border}`, borderRadius: 10,
                        padding: '11px 14px', boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                    }}
                >
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: tone.mark, marginBottom: 6 }}>
                        {title}
                    </div>
                    {messages.map((message, index) => (
                        <div
                            key={`${index}:${message}`}
                            style={{ fontSize: '0.7rem', color: '#CBD5E1', fontFamily: 'monospace', lineHeight: 1.55 }}
                        >
                            {message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
