// ─── Design System Tokens ────────────────────────────────────────────────────
//
// Shared constants for consistent Miro-quality rendering across all components.
// ─────────────────────────────────────────────────────────────────────────────

export const FONT = {
    badge: '12px',
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '15px',
    /** Explorer panel specific sizes */
    explorer: {
        heading: '14px',
        group: '13px',
        kind: '12px',
        item: '13px',
        element: '13px',
        count: '12px',
        search: '13px',
        tab: '13px',
    },
} as const;

/** Semantic text colors — ensures consistent contrast throughout the UI */
export const COLOR = {
    /** Primary text — headings, element names */
    primary: '#1a1a1a',
    /** Secondary text — descriptions, sub-labels */
    secondary: '#4B5563',
    /** Muted text — metadata, inactive items */
    muted: '#6B7280',
    /** Faint text — placeholders, disabled */
    faint: '#9CA3AF',
    /** Surface backgrounds */
    surface: '#FFFFFF',
    surfaceAlt: '#F7F7F5',
    /** Borders */
    border: '#E5E5E0',
    borderLight: '#EDEDEA',
    /** Accent */
    accent: '#2DD4A8',
    accentDark: '#1B3A4B',
} as const;

/** Tree icons for file-explorer style */
export const ICON = {
    folderOpen: '📂',
    folderClosed: '📁',
    document: '📄',
    chevronRight: '▶',
    chevronDown: '▼',
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
