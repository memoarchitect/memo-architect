// ─── Viewpoint dashboards ────────────────────────────────────────────────────
//
// Every viewpoint gets a dashboard without anyone writing one: a built-in page
// generated from the model — the viewpoint's description, its stakeholders and
// framed concerns, and each view it governs embedded live — with written
// placeholders for the commentary only a person can supply. Customizing it
// copies the generated markdown into a file, exactly like the home page.
//
// Stakeholders and concerns are ISO 42010's, declared on MemoViewpoint as
// `ref stakeholders` and `ref framedConcerns` (or as `frame` relationships).
// When the model declares none, the table says how to declare them instead of
// inventing any.
// ─────────────────────────────────────────────────────────────────────────────

import type { MemoModelDTO } from '@memoarchitect/tools/browser';

type Viewpoint = NonNullable<MemoModelDTO['viewpoints']>[number];
type Element = MemoModelDTO['elements'][string];

export const VIEWPOINT_DASHBOARD_PREFIX = 'viewpoint-';

/** The dashboard id for a viewpoint: stable across renames of its label. */
export function viewpointDashboardId(viewpointId: string): string {
    const slug = viewpointId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
    return `${VIEWPOINT_DASHBOARD_PREFIX}${slug || 'unnamed'}`;
}

const PLACEHOLDER = {
    description: '_Describe what this viewpoint is for: the question it answers and the decisions it informs._',
    purpose: '_Who reads these views, and what should they be able to decide afterwards?_',
    commentary: '_What should a reader notice in this view? What is incomplete, assumed, or still open?_',
    question: '_Record an open question, who owns it, and by when it needs an answer._',
    decision: '_Record a decision this viewpoint supports, with its rationale and a link to the evidence._',
};

/** A table cell must stay on one line and must not open a new column. */
const cell = (text: string) => text.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');

function viewpointElement(model: MemoModelDTO, viewpoint: Viewpoint): Element | undefined {
    return Object.values(model.elements).find(el =>
        el.construct === 'viewpoint'
        && (el.attributes?.providedId === viewpoint.id || el.attributes?.id === viewpoint.id || el.id === viewpoint.id));
}

/** Resolve a ref value like `(ops::clinician, nurse)` to elements where possible. */
function referencedNames(model: MemoModelDTO, raw: string | undefined): Array<{ name: string; element?: Element }> {
    if (!raw) return [];
    return raw.replace(/[()]/g, '').split(',').map(part => part.trim()).filter(Boolean).map(ref => {
        const local = ref.split('::').pop()!;
        const element = model.elements[ref] ?? model.elements[local]
            ?? Object.values(model.elements).find(el => el.id.endsWith(`::${local}`));
        return { name: element?.name ?? local, element };
    });
}

function describe(element: Element | undefined): string {
    const text = element?.attributes?.shortDescription || element?.attributes?.description || element?.doc;
    return text ? text.trim() : '';
}

export function viewpointDashboardMarkdown(model: MemoModelDTO, viewpoint: Viewpoint): string {
    const element = viewpointElement(model, viewpoint);
    const views = (model.diagrams ?? []).filter(d => d.viewpointId === viewpoint.id || d.viewpointIds?.includes(viewpoint.id));
    const children = (model.viewpoints ?? []).filter(vp => vp.parentId === viewpoint.id);

    const stakeholders = referencedNames(model, element?.attributes?.stakeholders);
    const concerns = referencedNames(model, element?.attributes?.framedConcerns);
    if (element) {
        for (const rel of model.relationships) {
            if (rel.sourceId !== element.id || !/frame/i.test(rel.type)) continue;
            const target = model.elements[rel.targetId];
            if (!concerns.some(c => c.element?.id === rel.targetId)) concerns.push({ name: target?.name ?? rel.targetId, element: target });
        }
    }

    const lines: string[] = [
        '---',
        `title: ${viewpoint.label.replace(/\n/g, ' ')}`,
        `viewpoint: ${viewpoint.id}`,
        '---',
        `# ${viewpoint.label}`,
        '',
        describe(element) || PLACEHOLDER.description,
        '',
        `> **Purpose** — ${PLACEHOLDER.purpose}`,
        '',
        '## Stakeholders and concerns',
        '',
        '| Stakeholder | Concern | How the views below address it |',
        '| --- | --- | --- |',
    ];

    if (stakeholders.length === 0 && concerns.length === 0) {
        lines.push('| _Who is this for?_ | _What do they need to know?_ | _Which view answers it, and how?_ |');
        lines.push('');
        lines.push('No stakeholders or concerns are declared on this viewpoint yet. Declare them in the model as `stakeholders` and `framedConcerns` on the viewpoint and they are listed here.');
    } else {
        const rows = Math.max(stakeholders.length, concerns.length);
        for (let i = 0; i < rows; i++) {
            const concern = concerns[i];
            const concernText = concern ? `**${concern.name}**${describe(concern.element) ? ` — ${describe(concern.element)}` : ''}` : '';
            lines.push(`| ${cell(stakeholders[i]?.name ?? '')} | ${cell(concernText)} | _How is this addressed?_ |`);
        }
    }

    lines.push('', '## Views', '');
    if (views.length === 0) {
        lines.push('_No views conform to this viewpoint yet. Add one with **New View** under the viewpoint in the Viewpoints tree._');
    } else {
        lines.push(`This viewpoint governs ${views.length} view${views.length === 1 ? '' : 's'}. Each is live: it changes when the model does.`);
        for (const view of [...views].sort((a, b) => a.name.localeCompare(b.name))) {
            lines.push('', `### ${view.name}`, '');
            if (view.description?.trim()) lines.push(view.description.trim(), '');
            lines.push(`{{diagram:${view.id}}}`, '', `**Commentary** — ${PLACEHOLDER.commentary}`);
        }
    }

    if (children.length > 0) {
        lines.push('', '## Framed viewpoints', '');
        for (const child of children) lines.push(`- [${child.label}](/dashboards/${viewpointDashboardId(child.id)})`);
    }

    lines.push(
        '', '## Open questions', '', `- ${PLACEHOLDER.question}`,
        '', '## Decisions and rationale', '', `- ${PLACEHOLDER.decision}`,
        '',
    );
    return lines.join('\n');
}
