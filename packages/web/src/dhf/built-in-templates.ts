// ─── Built-in DHF Template Loader ────────────────────────────────────────────
//
// Loads all markdown template files from the installed ontology package
// (node_modules/@memoarchitect/ontology/) at build time via Vite's
// import.meta.glob. Templates are compliance content owned by the ontology
// repo; the templateId (e.g. "iso-14971/rmp") maps directly to a file path
// within that directory.
//
// {{include:...}} directives are resolved inline so the editor shows complete
// content. {{project.*}}, {{toc}}, memo-query blocks, etc. are left as-is —
// they are rendered as preview placeholders by DhfWorkbench and resolved at
// export time by the CLI.
// ─────────────────────────────────────────────────────────────────────────────

// Vite loads all .md files under the installed ontology package as raw strings.
// The meta checkout may include the ontology submodule, but package resolution
// deliberately goes through node_modules so standalone clones build the same way.
// The templates moved from `src/compliance/dhf-templates/` to
// `src/artifacts/templates/dhf/` when the artifacts taxonomy landed. This glob
// kept pointing at the old path, so TEMPLATE_MAP was silently empty and every
// built-in template in the wizard came up blank — a stale literal here cannot
// fail loudly, because a glob that matches nothing is not an error. The
// assertion below is what makes the next such move noisy.
const _rawTemplates = import.meta.glob(
    '../../../../node_modules/@memoarchitect/ontology/src/artifacts/templates/dhf/**/*.md',
    { query: '?raw', eager: true, import: 'default' }
) as Record<string, string>;

// Build map: "iso-14971/rmp" → raw markdown content
const TEMPLATE_MAP: Record<string, string> = {};
for (const [path, content] of Object.entries(_rawTemplates)) {
    // path looks like: .../templates/dhf/iso-14971/rmp.md
    const match = path.match(/templates\/dhf\/(.+)\.md$/);
    if (match) {
        TEMPLATE_MAP[match[1]] = content;
    }
}

/**
 * Number of templates the glob resolved. Exported so a test can assert the
 * loader found the ontology at all, rather than discovering a path drift only
 * when a user opens an empty document.
 */
export const builtInTemplateCount = Object.keys(TEMPLATE_MAP).length;

// ─── Frontmatter ─────────────────────────────────────────────────────────────
//
// Only the three keys the wizard groups and labels by. This is deliberately a
// reader for the shipped subset, not a YAML parser: the templates are content
// this repo ships, `memo dhf lint` already rejects frontmatter it cannot parse,
// and pulling a YAML dependency into the web bundle to read three scalar keys
// would cost more than it explains.
export interface BuiltInTemplateInfo {
    /** e.g. "iso-14971/rmp" */
    id: string;
    /** Standard directory the template lives in, e.g. "iso-14971" */
    directory: string;
    title?: string;
    /** Full designation, e.g. "IEC 62304:2006+AMD1:2015" */
    standard?: string;
    clauses: string[];
}

function frontmatterBlock(md: string): string {
    const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return match ? match[1] : '';
}

function scalar(block: string, key: string): string | undefined {
    const m = block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    if (!m) return undefined;
    return m[1].trim().replace(/^["']|["']$/g, '') || undefined;
}

function list(block: string, key: string): string[] {
    const m = block.match(new RegExp(`^${key}:\\s*\\[(.*)\\]$`, 'm'));
    if (!m) return [];
    return m[1].split(',').map(v => v.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

/**
 * Every shipped template with the frontmatter the UI groups by.
 *
 * Snippets under `shared/` are excluded: an approval block is a fragment, not
 * a document, and it claims no standard.
 */
export function listBuiltInTemplates(): BuiltInTemplateInfo[] {
    const out: BuiltInTemplateInfo[] = [];
    for (const [id, raw] of Object.entries(TEMPLATE_MAP)) {
        const slash = id.indexOf('/');
        if (slash < 0) continue;
        const directory = id.slice(0, slash);
        if (directory === 'shared') continue;
        const block = frontmatterBlock(raw);
        out.push({
            id,
            directory,
            title: scalar(block, 'title'),
            standard: scalar(block, 'standard'),
            clauses: list(block, 'clauses'),
        });
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** Strip YAML frontmatter block from markdown */
function stripFrontmatter(md: string): string {
    return md.replace(/^---[\s\S]*?---\n?/, '');
}

/**
 * Resolve {{include:path}} directives by inlining the snippet content.
 * The .md extension is optional in the include path.
 */
function resolveIncludes(content: string): string {
    return content.replace(/\{\{include:([^}]+)\}\}/g, (_match, includePath: string) => {
        const key = includePath.replace(/\.md$/, '');
        const snippet = TEMPLATE_MAP[key];
        if (!snippet) {
            return `<!-- [include: ${includePath} — not found] -->`;
        }
        // Inline snippet without its own frontmatter
        return resolveIncludes(stripFrontmatter(snippet));
    });
}

/**
 * Returns the full prefilled content for a built-in template ID.
 * Includes are resolved inline. Returns null if the template is not found.
 *
 * @param templateId  e.g. "iso-14971/rmp", "iec-62304/sdp"
 */
export function getBuiltInTemplate(templateId: string): string | null {
    const raw = TEMPLATE_MAP[templateId];
    if (!raw) return null;
    return resolveIncludes(raw);
}

/** List all available built-in template IDs */
export function listBuiltInTemplateIds(): string[] {
    return Object.keys(TEMPLATE_MAP);
}

/** Check if a built-in template exists for the given ID */
export function hasBuiltInTemplate(templateId: string): boolean {
    return templateId in TEMPLATE_MAP;
}
