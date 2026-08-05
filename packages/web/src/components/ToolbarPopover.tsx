// ─── Toolbar Popover ─────────────────────────────────────────────────────────
//
// A labelled button that opens a small panel of settings.
//
// It exists to keep matrix toolbars short. The controls that decide *what the
// matrix is* — the axes and what counts as a dependency — belong on screen at
// all times. The ones you set once and forget (how nesting is derived, whether
// packages group the roots, whether column names are drawn) do not, and a row
// of fourteen widgets makes the three that matter harder to find.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { COLOR, FONT, SHADOW } from '../styles/tokens';

export interface ToolbarPopoverProps {
    label: string;
    children: ReactNode;
    /** Shown next to the label, e.g. how many settings are off their default. */
    badge?: string;
    title?: string;
    width?: number;
}

export function ToolbarPopover({ label, children, badge, title, width = 260 }: ToolbarPopoverProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!ref.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                title={title}
                onClick={() => setOpen(value => !value)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '3px 8px', borderRadius: '5px',
                    border: `1px solid ${open || badge ? COLOR.accent : COLOR.border}`,
                    background: open ? '#E8F8F3' : COLOR.surface,
                    fontSize: FONT.xs, color: COLOR.secondary, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
                {badge && (
                    <span style={{
                        fontSize: '10px', padding: '0 4px', borderRadius: '7px',
                        background: COLOR.accent, color: '#08331F', fontWeight: 700,
                    }}>
                        {badge}
                    </span>
                )}
                <span style={{ fontSize: '9px', color: COLOR.faint }}>{'▾'}</span>
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label={label}
                    style={{
                        position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 60,
                        width, padding: '10px 12px', background: COLOR.surface,
                        border: `1px solid ${COLOR.border}`, borderRadius: '7px',
                        boxShadow: SHADOW.lg,
                        display: 'flex', flexDirection: 'column', gap: '9px',
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );
}
