// ─── Design System Tokens ────────────────────────────────────────────────────
//
// Shared constants for consistent Miro-quality rendering across all components.
// ─────────────────────────────────────────────────────────────────────────────

export const FONT = {
    badge: '10px',
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '14px',
} as const;

export const SHADOW = {
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 2px 8px rgba(0,0,0,0.1)',
    lg: '0 4px 16px rgba(0,0,0,0.12)',
    hover: '0 4px 20px rgba(0,0,0,0.15)',
    selected: '0 0 0 2px #2DD4A8, 0 4px 12px rgba(45, 212, 168, 0.3)',
} as const;

export const RADIUS = {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
} as const;

export const TRANSITION = {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease',
} as const;

export const EDGE = {
    defaultWidth: 2,
    flowWidth: 2.5,
    successionWidth: 1,
    hoverWidth: 3,
    arrowSize: 16,
    labelBgPadding: [6, 4] as [number, number],
    labelBgRadius: 6,
    labelBgStyle: {
        fill: '#FFFFFF',
        fillOpacity: 0.92,
        stroke: '#E5E5E0',
        strokeWidth: 0.5,
    },
} as const;
