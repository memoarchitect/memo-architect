// ─── iOS-style diagram toolbar primitives ────────────────────────────────────
//
// Small, reusable controls for the diagram header toolbar: segmented controls,
// icon toggles, and clustered icon buttons. Styled after the iOS / SF Symbols
// idiom — a translucent gray track with a raised white pill for the selected
// segment, filled accent pills for active toggles, and hairline-divided
// clusters that group related actions.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';

const TRACK = '#ECEBE6';
const ACTIVE = '#1B3A4B';
const IDLE_FG = '#5B6470';
const PILL_SHADOW = '0 1px 2px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.05)';

// ─── SF-Symbol-flavoured inline icons (24×24 grid, 16px rendered) ────────────
type IconProps = { size?: number };
const svg = (size: number, children: React.ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" style={{ display: 'block' }}>
        {children}
    </svg>
);

export const Icon = {
    arrowRight: ({ size = 16 }: IconProps) => svg(size, <><path d="M4 12h14" /><path d="M13 6l6 6-6 6" /></>),
    arrowDown: ({ size = 16 }: IconProps) => svg(size, <><path d="M12 4v14" /><path d="M6 13l6 6 6-6" /></>),
    lanes: ({ size = 16 }: IconProps) => svg(size, <><rect x="3" y="5" width="18" height="3.4" rx="1.3" /><rect x="3" y="10.3" width="18" height="3.4" rx="1.3" /><rect x="3" y="15.6" width="18" height="3.4" rx="1.3" /></>),
    grid: ({ size = 16 }: IconProps) => svg(size, <><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" /></>),
    expand: ({ size = 16 }: IconProps) => svg(size, <><path d="M15 4h5v5" /><path d="M9 20H4v-5" /><path d="M20 4l-7 7" /><path d="M4 20l7-7" /></>),
    collapse: ({ size = 16 }: IconProps) => svg(size, <><path d="M14 10h5" /><path d="M19 10V5" /><path d="M10 14H5" /><path d="M5 14v5" /><path d="M20 4l-6 6" /><path d="M4 20l6-6" /></>),
    filter: ({ size = 16 }: IconProps) => svg(size, <path d="M4 5h16l-6.2 7.4V19l-3.6 1.8v-8.4z" />),
    back: ({ size = 16 }: IconProps) => svg(size, <><path d="M11 5l-6 7 6 7" /><path d="M5 12h14" /></>),
    rectangle: ({ size = 16 }: IconProps) => svg(size, <><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M8 5v14M16 5v14" strokeDasharray="2 2" /></>),
    upload: ({ size = 16 }: IconProps) => svg(size, <><path d="M12 16V4" /><path d="M7.5 8.5 12 4l4.5 4.5" /><path d="M4 15v4h16v-4" /></>),
    capture: ({ size = 16 }: IconProps) => svg(size, <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M8 6l1.5-2h5L16 6" /><circle cx="12" cy="12.5" r="3.2" /></>),
    info: ({ size = 16 }: IconProps) => svg(size, <><circle cx="12" cy="12" r="9" /><path d="M12 10.5v6" /><path d="M12 7.5h.01" /></>),
    plus: ({ size = 16 }: IconProps) => svg(size, <><path d="M12 5v14" /><path d="M5 12h14" /></>),
    library: ({ size = 16 }: IconProps) => svg(size, <><rect x="4" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="16" rx="1" /><path d="M17 5l3 14" /></>),
    detect: ({ size = 16 }: IconProps) => svg(size, <><path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" /><rect x="7" y="8" width="10" height="8" rx="1.5" strokeDasharray="2 2" /></>),
    // Two connectors settling into parallel orthogonal lanes.
    tidy: ({ size = 16 }: IconProps) => svg(size, <><path d="M3 7h6l4-4h8" /><path d="M3 17h6l4 4h8" /><circle cx="3" cy="7" r="1.3" /><circle cx="3" cy="17" r="1.3" /></>),
    download: ({ size = 16 }: IconProps) => svg(size, <><path d="M12 4v11" /><path d="M7.5 10.5 12 15l4.5-4.5" /><path d="M4 16v3h16v-3" /></>),
};

// ─── Divider between toolbar groups ──────────────────────────────────────────
export function ToolbarSep() {
    return <span aria-hidden="true" style={{ width: 1, height: 18, background: '#E2E1DB', margin: '0 3px', borderRadius: 1 }} />;
}

// ─── Segmented control (mutually-exclusive choice) ───────────────────────────
export type SegmentOption<T extends string> = { value: T; icon?: React.ReactNode; label?: string; title?: string };

export function Segmented<T extends string>({ options, value, onChange }: {
    options: SegmentOption<T>[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div role="tablist" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, background: TRACK, borderRadius: 9 }}>
            {options.map(opt => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(opt.value)}
                        title={opt.title}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                        style={{
                            padding: opt.label ? '3px 9px' : '4px 7px',
                            borderRadius: 7,
                            border: 'none',
                            cursor: 'pointer',
                            color: active ? ACTIVE : IDLE_FG,
                            background: active ? '#FFFFFF' : 'transparent',
                            boxShadow: active ? PILL_SHADOW : 'none',
                            transition: 'background 140ms ease, color 140ms ease, box-shadow 140ms ease',
                        }}
                    >
                        {opt.icon}
                        {opt.label && <span>{opt.label}</span>}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Clustered icon buttons (grouped related actions) ────────────────────────
export function ToolbarCluster({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E1DB', borderRadius: 9, overflow: 'hidden' }}>
            {React.Children.toArray(children).map((child, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', background: '#EDECE7' }} />}
                    {child}
                </React.Fragment>
            ))}
        </div>
    );
}

// ─── Icon button / toggle ────────────────────────────────────────────────────
export function IconButton({ icon, label, onClick, active = false, title, ariaExpanded, ariaLabel }: {
    icon: React.ReactNode;
    label?: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    title?: string;
    ariaExpanded?: boolean;
    /** Accessible name for icon-only buttons (no visible label). */
    ariaLabel?: string;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            aria-label={ariaLabel}
            aria-pressed={active}
            aria-expanded={ariaExpanded}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{
                padding: label ? '5px 9px' : '5px 7px',
                border: 'none',
                cursor: 'pointer',
                color: active ? '#FFFFFF' : IDLE_FG,
                background: active ? ACTIVE : 'transparent',
                transition: 'background 140ms ease, color 140ms ease',
            }}
        >
            {icon}
            {label && <span>{label}</span>}
        </button>
    );
}

// ─── Standalone icon toggle (rounded, own border) ────────────────────────────
export function IconToggle({ icon, label, onClick, active = false, title, badge }: {
    icon: React.ReactNode;
    label?: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    title?: string;
    badge?: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            aria-pressed={active}
            className="flex items-center gap-1.5 text-xs font-semibold"
            style={{
                padding: (badge != null || label != null) ? '5px 9px' : '5px 7px',
                borderRadius: 9,
                border: `1px solid ${active ? ACTIVE : '#E2E1DB'}`,
                cursor: 'pointer',
                color: active ? '#FFFFFF' : IDLE_FG,
                background: active ? ACTIVE : '#FFFFFF',
                transition: 'background 140ms ease, color 140ms ease, border-color 140ms ease',
            }}
        >
            {icon}
            {label != null && <span>{label}</span>}
            {badge != null && (
                <span style={{
                    fontSize: 11, fontWeight: 700, lineHeight: 1, padding: '2px 5px', borderRadius: 6,
                    background: active ? 'rgba(255,255,255,0.22)' : '#F0EFEA', color: active ? '#FFFFFF' : '#6B7280',
                }}>{badge}</span>
            )}
        </button>
    );
}
