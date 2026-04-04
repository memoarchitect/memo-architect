// ─── DHF Template Resolver ────────────────────────────────────────────────────
//
// Resolves DHF document templates from:
//   1. Custom template directory (memo.dhf.yaml → template_dir)
//   2. Built-in templates (packages/core/src/dhf/templates/)
//
// Also handles {{include:path}} partial resolution and {{project.*}} expansion.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Built-in templates directory, relative to this file */
const BUILTIN_TEMPLATES_DIR = resolve(__dirname, 'templates');

export interface TemplateLoadResult {
    content: string;
    /** Absolute path the template was loaded from */
    sourcePath: string;
    /** Parsed frontmatter (id, title, standard, clauses, required_for) */
    frontmatter: TemplateFrontmatter;
    /** Body content (after frontmatter) */
    body: string;
}

export interface TemplateFrontmatter {
    id?: string;
    title?: string;
    standard?: string;
    clauses?: string[];
    required_for?: string[];
    [key: string]: unknown;
}

// ─── Frontmatter parser ───────────────────────────────────────────────────────

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

import * as yaml from 'yaml';

export function parseFrontmatter(content: string): { frontmatter: TemplateFrontmatter; body: string } {
    const match = content.match(FRONTMATTER_RE);
    if (!match) return { frontmatter: {}, body: content };

    try {
        const frontmatter = yaml.parse(match[1]) as TemplateFrontmatter ?? {};
        return { frontmatter, body: match[2] ?? '' };
    } catch {
        return { frontmatter: {}, body: content };
    }
}

// ─── Resolve template paths ───────────────────────────────────────────────────

/**
 * Resolve the filesystem path for a template ID.
 * Searches:
 *   1. Custom template dir (if provided)
 *   2. Built-in templates (BUILTIN_TEMPLATES_DIR)
 */
export function resolveTemplatePath(
    templateId: string,
    customTemplateDir?: string,
): string | null {
    const candidates = buildCandidatePaths(templateId, customTemplateDir);
    for (const p of candidates) {
        if (existsSync(p)) return p;
    }
    return null;
}

function buildCandidatePaths(templateId: string, customDir?: string): string[] {
    const paths: string[] = [];
    const variants = [
        templateId,
        `${templateId}.md`,
        templateId.replace('/', '/') + '.md',
    ];

    if (customDir) {
        for (const v of variants) {
            paths.push(join(customDir, v));
        }
    }

    for (const v of variants) {
        paths.push(join(BUILTIN_TEMPLATES_DIR, v));
        // Also try standard-prefixed paths
        for (const standard of ['iso-14971', 'iec-62304', 'iec-62366', '21cfr820', 'fda-cybersecurity', 'shared']) {
            paths.push(join(BUILTIN_TEMPLATES_DIR, standard, v));
            paths.push(join(BUILTIN_TEMPLATES_DIR, standard, 'snippets', v));
        }
    }

    return paths;
}

// ─── Load a template ─────────────────────────────────────────────────────────

export function loadTemplate(
    templateId: string,
    customTemplateDir?: string,
): TemplateLoadResult | null {
    const path = resolveTemplatePath(templateId, customTemplateDir);
    if (!path) return null;

    try {
        const content = readFileSync(path, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);
        return { content, sourcePath: path, frontmatter, body };
    } catch {
        return null;
    }
}

// ─── Resolve {{include:path}} partials ────────────────────────────────────────

const INCLUDE_RE = /\{\{include:([^}]+)\}\}/g;

export function resolveIncludes(
    content: string,
    baseDir: string,
    customTemplateDir?: string,
    depth = 0,
): string {
    if (depth > 5) return content; // Prevent infinite recursion

    return content.replace(INCLUDE_RE, (_match, includePath: string) => {
        const trimmed = includePath.trim();

        // Try relative to base dir first
        const relativePath = resolve(baseDir, trimmed);
        if (existsSync(relativePath)) {
            try {
                const included = readFileSync(relativePath, 'utf-8');
                const { body } = parseFrontmatter(included);
                return resolveIncludes(body, dirname(relativePath), customTemplateDir, depth + 1);
            } catch { /* fall through */ }
        }

        // Try as template ID
        const templatePath = resolveTemplatePath(trimmed, customTemplateDir);
        if (templatePath) {
            try {
                const included = readFileSync(templatePath, 'utf-8');
                const { body } = parseFrontmatter(included);
                return resolveIncludes(body, dirname(templatePath), customTemplateDir, depth + 1);
            } catch { /* fall through */ }
        }

        return `\n> ⚠️ Include not found: ${trimmed}\n`;
    });
}

// ─── Resolve {{project.*}} directives ─────────────────────────────────────────

export function resolveProjectDirectives(
    content: string,
    projectMeta: Record<string, unknown>,
): string {
    const PROJECT_RE = /\{\{project\.([^}]+)\}\}/g;
    return content.replace(PROJECT_RE, (_match, key: string) => {
        const value = getNestedValue(projectMeta, key.trim());
        return value !== undefined ? String(value) : `{{project.${key}}}`;
    });
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
    const parts = key.split('.');
    let current: unknown = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

// ─── List all available built-in templates ────────────────────────────────────

import { readdirSync } from 'node:fs';

export interface BuiltinTemplateInfo {
    id: string;
    path: string;
    standard: string;
    frontmatter: TemplateFrontmatter;
}

export function listBuiltinTemplates(): BuiltinTemplateInfo[] {
    const results: BuiltinTemplateInfo[] = [];

    function scan(dir: string, standard: string): void {
        try {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                const full = join(dir, entry.name);
                if (entry.isDirectory()) {
                    scan(full, entry.name);
                } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
                    const id = entry.name.replace(/\.md$/, '');
                    try {
                        const content = readFileSync(full, 'utf-8');
                        const { frontmatter } = parseFrontmatter(content);
                        results.push({ id: `${standard}/${id}`, path: full, standard, frontmatter });
                    } catch { /* skip */ }
                }
            }
        } catch { /* skip if dir doesn't exist */ }
    }

    if (existsSync(BUILTIN_TEMPLATES_DIR)) {
        scan(BUILTIN_TEMPLATES_DIR, 'shared');
    }

    return results;
}
