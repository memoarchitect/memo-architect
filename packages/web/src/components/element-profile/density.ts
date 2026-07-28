// ─── Profile density ─────────────────────────────────────────────────────────
//
// The element profile renders in two places: the full page in the main canvas
// and the properties side panel. They are the same information and the same
// affordances — only the room differs, so they differ by a density token rather
// than by being two separately maintained components that drift.
// ─────────────────────────────────────────────────────────────────────────────

/** 'page' is the roomy main-canvas profile; 'panel' is the compact side panel. */
export type Density = 'page' | 'panel';

export interface DensityTokens {
    /** Body text inside fields and rows. */
    text: string;
    /** Section heading text. */
    heading: string;
    /** Small print: reasons, metadata, source paths. */
    meta: string;
    /** Padding inside an editable or read-only value box. */
    valuePadding: string;
    /** Vertical gap between stacked fields. */
    fieldGap: string;
    /** Padding around a section's contents. */
    sectionPadding: string;
    /** Corner radius for value boxes and cards. */
    radius: string;
    /** Whether attribute rows may sit two-up; the panel is too narrow. */
    twoColumnAttributes: boolean;
}

const PAGE: DensityTokens = {
    text: '14px',
    heading: '13px',
    meta: '12px',
    valuePadding: '9px 12px',
    fieldGap: '10px',
    sectionPadding: '0 0 18px 0',
    radius: '10px',
    twoColumnAttributes: true,
};

const PANEL: DensityTokens = {
    text: '12px',
    heading: '12px',
    meta: '11px',
    valuePadding: '4px 7px',
    fieldGap: '5px',
    sectionPadding: '0 0 10px 0',
    radius: '7px',
    twoColumnAttributes: false,
};

export function densityTokens(density: Density): DensityTokens {
    return density === 'page' ? PAGE : PANEL;
}
