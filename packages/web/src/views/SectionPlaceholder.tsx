// ─── A navigation section whose pages are not built yet ─────────────────────
//
// Change and Releases are sections of the navigation now, so the shape of the
// app is the one the product-family plan describes, and their pages arrive
// with later milestones. Until then each says what it will hold and where that
// work stands today.
// ─────────────────────────────────────────────────────────────────────────────

import { COLOR, FONT } from '../styles/tokens';

export function SectionPlaceholder({ title, summary, items }: { title: string; summary: string; items: string[] }) {
    return (
        <div style={{ padding: '32px 40px', maxWidth: 720, color: COLOR.primary }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>{title}</h1>
            <p style={{ fontSize: FONT.sm, color: COLOR.muted, margin: '0 0 16px' }}>{summary}</p>
            <ul style={{ fontSize: FONT.sm, lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
                {items.map(item => <li key={item}>{item}</li>)}
            </ul>
            <p style={{ fontSize: FONT.xs, color: COLOR.faint, marginTop: 20 }}>Not built yet.</p>
        </div>
    );
}

export function ChangePage() {
    return (
        <SectionPlaceholder
            title="Change"
            summary="A project is a change set to one or more systems in an iteration. This page will list them and what each one affects."
            items={[
                'Projects: name, tracker link, and the releases each one feeds.',
                'Impact of a branch: the requirements, risks, tests, systems, releases and regulated devices it reaches.',
                'Model Diff, under Change in the navigation, compares two states of the model today.',
            ]}
        />
    );
}

export function ReleasesPage() {
    return (
        <SectionPlaceholder
            title="Releases"
            summary="Every released item has a part number and revision, held in a release record. This page will list them by item and state."
            items={[
                'Release records through their lifecycle, with the features each selects and the interface revisions it implements.',
                'System-of-systems versions: the validated configuration of system releases, and its evidence.',
                'Features by market, and a diff of any two releases.',
            ]}
        />
    );
}
