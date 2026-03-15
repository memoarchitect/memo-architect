// ─── Shared Design Constants ─────────────────────────────────────────────────
//
// Single source of truth for CoSMA layer colors and design tokens.
// ─────────────────────────────────────────────────────────────────────────────

export const LAYER_COLORS: Record<string, string> = {
    business: '#8E44AD',
    requirements: '#4A90D9',
    risk: '#E74C3C',
    functional: '#E67E22',
    logical: '#7B68EE',
    physical: '#95A5A6',
    software: '#F39C12',
    interfaces: '#1ABC9C',
    verification: '#2ECC71',
    ui: '#3498DB',
};

export const LAYER_ORDER = [
    'business', 'requirements', 'risk', 'functional', 'logical',
    'physical', 'software', 'interfaces', 'verification', 'ui',
] as const;

export const REL_COLORS: Record<string, string> = {
    mitigates: '#E74C3C',
    causes: '#C0392B',
    leadsTo: '#E74C3C',
    identifies: '#D35400',
    traceTo: '#4A90D9',
    satisfy: '#2ECC71',
    verify: '#27AE60',
    allocateTo: '#E67E22',
    aggregation: '#7B68EE',
    composedOf: '#8E44AD',
};
