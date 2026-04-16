// ─── Built-in DHF Template Loader ────────────────────────────────────────────
//
// Loads all markdown template files from packages/core/src/dhf/templates/ at
// build time via Vite's import.meta.glob. The templateId (e.g. "iso-14971/rmp")
// maps directly to a file path within the templates directory.
//
// {{include:...}} directives are resolved inline so the editor shows complete
// content. {{project.*}}, {{toc}}, memo-query blocks, etc. are left as-is —
// they are rendered as preview placeholders by DhfWorkbench and resolved at
// export time by the CLI.
// ─────────────────────────────────────────────────────────────────────────────

// Vite loads all .md files under the templates directory as raw strings.
// Path is relative to this file: packages/web/src/dhf/ → packages/core/src/dhf/templates/
const _rawTemplates = import.meta.glob(
    '../../../core/src/dhf/templates/**/*.md',
    { query: '?raw', eager: true, import: 'default' }
) as Record<string, string>;

// Build map: "iso-14971/rmp" → raw markdown content
const TEMPLATE_MAP: Record<string, string> = {};
for (const [path, content] of Object.entries(_rawTemplates)) {
    // path looks like: ../../../core/src/dhf/templates/iso-14971/rmp.md
    const match = path.match(/templates\/(.+)\.md$/);
    if (match) {
        TEMPLATE_MAP[match[1]] = content;
    }
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
