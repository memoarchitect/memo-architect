// ─── Controls with one meaning each ───────────────────────────────────────────
//
// A control says what it is by how it looks, so a person does not have to try it to find out:
//
//   SegmentedControl, Switch   a STATE you set. They sit in a recessed tray, the chosen one is raised with a tick
//                              (a switch has a track that is on or off). Clicking does not do anything; it changes
//                              what is shown.
//   ActionButton               an ACTION you take. A raised button with an icon: filled for the one main action,
//                              outlined for the others. Clicking does something.
//   TextAction                 a quiet action inside a sentence: underlined text.
//
// Nothing else on the screen uses these looks, so a tray is always a setting and a button is always a verb.

import type { ReactNode } from 'react';
import { COLOR, FONT } from '../styles/tokens';

const icon = (paths: ReactNode) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
        {paths}
    </svg>
);

export const ControlIcon = {
    check: icon(<path d="M3 8.5l3.2 3.2L13 4.8" />),
    plus: icon(<path d="M8 3v10M3 8h10" />),
    build: icon(<><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.8" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="0.8" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="0.8" /><rect x="9" y="9" width="4.5" height="4.5" rx="0.8" /></>),
    rebuild: icon(<><path d="M13 8a5 5 0 1 1-1.6-3.7" /><path d="M13 2.8V6h-3.2" /></>),
    save: icon(<><path d="M3 3h8l2 2v8H3z" /><path d="M5.5 3v3.5h4V3M5.5 13V9.5h5V13" /></>),
    edit: icon(<path d="M10.8 3.2l2 2L6 12l-2.8.8L4 10z" />),
    close: icon(<path d="M4 4l8 8M12 4l-8 8" />),
    grid: icon(<><rect x="2.5" y="2.5" width="11" height="11" rx="1" /><path d="M2.5 8h11M8 2.5v11" /></>),
    list: icon(<path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.1M2.5 8h.1M2.5 12h.1" />),
};

// ── states ───────────────────────────────────────────────────────────────────

export interface SegmentOption<T extends string> {
    id: T;
    label: string;
    title?: string;
    icon?: ReactNode;
    /** The look of this option when it is the chosen one. */
    tone?: 'default' | 'warn';
}

/** One of several settings. The chosen segment is raised and ticked. */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, disabled = false }: {
    options: readonly SegmentOption<T>[];
    value: T;
    onChange: (next: T) => void;
    ariaLabel: string;
    disabled?: boolean;
}) {
    return (
        <div
            role="radiogroup" aria-label={ariaLabel}
            style={{
                display: 'inline-flex', padding: '2px', gap: '2px', borderRadius: '8px',
                background: '#E9EEF2', boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.10)', opacity: disabled ? 0.45 : 1,
            }}
        >
            {options.map(option => {
                const chosen = option.id === value;
                const warn = chosen && option.tone === 'warn';
                return (
                    <button
                        key={option.id} type="button" role="radio" aria-checked={chosen} disabled={disabled}
                        title={option.title} onClick={() => onChange(option.id)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '6px',
                            border: 'none', fontSize: FONT.xs, fontWeight: chosen ? 700 : 500,
                            cursor: disabled ? 'not-allowed' : chosen ? 'default' : 'pointer',
                            background: chosen ? COLOR.surface : 'transparent',
                            color: chosen ? (warn ? '#B45309' : COLOR.accentDark) : COLOR.muted,
                            boxShadow: chosen ? '0 1px 2px rgba(15,23,42,0.18)' : 'none',
                        }}
                    >
                        {chosen ? ControlIcon.check : option.icon}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/** An on/off setting: a track with a knob, and what it is for. */
export function Switch({ label, checked, onChange, disabled = false, title }: {
    label: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; title?: string;
}) {
    return (
        <button
            type="button" role="switch" aria-checked={checked} disabled={disabled} title={title} onClick={() => onChange(!checked)}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '2px 0', border: 'none', background: 'none',
                fontSize: FONT.xs, fontWeight: 600, color: disabled ? COLOR.faint : COLOR.primary, cursor: disabled ? 'not-allowed' : 'pointer',
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    position: 'relative', width: '30px', height: '17px', borderRadius: '9px', flexShrink: 0,
                    background: checked ? COLOR.accent : '#CBD5E1', transition: 'background 120ms ease',
                }}
            >
                <span style={{
                    position: 'absolute', top: '2px', left: checked ? '15px' : '2px', width: '13px', height: '13px', borderRadius: '50%',
                    background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.3)', transition: 'left 120ms ease',
                }} />
            </span>
            {label}
            <span style={{ fontWeight: 500, color: checked ? COLOR.accentDark : COLOR.faint }}>{checked ? 'On' : 'Off'}</span>
        </button>
    );
}

// ── actions ──────────────────────────────────────────────────────────────────

export type ActionVariant = 'primary' | 'secondary';

/** A verb: raised, with an icon. Filled when it is the main thing to do here. */
export function ActionButton({ children, onClick, icon: leading, variant = 'secondary', disabled = false, title, type = 'button' }: {
    children: ReactNode;
    onClick?: () => void;
    icon?: ReactNode;
    variant?: ActionVariant;
    disabled?: boolean;
    title?: string;
    type?: 'button' | 'submit';
}) {
    const primary = variant === 'primary' && !disabled;
    return (
        <button
            type={type} onClick={onClick} disabled={disabled} title={title}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 13px', borderRadius: '7px',
                fontSize: FONT.xs, fontWeight: 700, whiteSpace: 'nowrap',
                border: `1px solid ${primary ? COLOR.accentDark : disabled ? COLOR.borderLight : COLOR.border}`,
                background: primary ? COLOR.accent : disabled ? COLOR.surfaceAlt : COLOR.surface,
                color: primary ? '#fff' : disabled ? COLOR.faint : COLOR.primary,
                boxShadow: disabled ? 'none' : '0 1px 2px rgba(15,23,42,0.16)',
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
        >
            {leading}
            {children}
        </button>
    );
}

/** An action inside a sentence: underlined text. */
export function TextAction({ children, onClick, title }: { children: ReactNode; onClick: () => void; title?: string }) {
    return (
        <button
            type="button" onClick={onClick} title={title}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit', fontWeight: 600, color: COLOR.accentDark, textDecoration: 'underline', textUnderlineOffset: '2px' }}
        >
            {children}
        </button>
    );
}
