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
    label: ReactNode;
    /** Required when the visible trigger is icon-only. */
    ariaLabel?: string;
    children: ReactNode;
    /** Shown next to the label, e.g. how many settings are off their default. */
    badge?: string;
    title?: string;
    width?: number;
    /** Optional controlled state, used when a related canvas control opens this popover. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Make the trigger fill its toolbar grid cell. */
    fullWidth?: boolean;
}

export function ToolbarPopover({ label, ariaLabel, children, badge, title, width = 260, open: controlledOpen, onOpenChange, fullWidth = false }: ToolbarPopoverProps) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = (next: boolean | ((current: boolean) => boolean)) => {
        const value = typeof next === 'function' ? next(open) : next;
        if (controlledOpen === undefined) setUncontrolledOpen(value);
        onOpenChange?.(value);
    };
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
        <div ref={ref} style={{ position: 'relative', width: fullWidth ? '100%' : undefined }}>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={ariaLabel}
                title={title}
                onClick={() => setOpen(value => !value)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    width: fullWidth ? '100%' : undefined, justifyContent: fullWidth ? 'center' : undefined,
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
                    aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'Options')}
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
