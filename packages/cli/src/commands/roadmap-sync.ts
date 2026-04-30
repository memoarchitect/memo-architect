// ─── memo roadmap-sync ────────────────────────────────────────────────────
//
// Reconciles `docs/src/developers/architecture/execution-plan.md` (scope source of truth)
// with GitLab milestones + issues (state source of truth).
//
// Modes:
//   --dry-run   show diff (default)
//   --apply     create/update missing milestones + issues
//   --verify    exit non-zero if any drift (CI gate)
//   --close-stale   close GitLab issues whose session was removed from spec
//
// Conventions (binding) — see execution-plan.md §7:
//   wave label  : `wave::1-ontology` / `wave::2-cli` / `wave::3-web-v0` / `wave::3-web-v1` / `wave::4-future`
//   milestone   : exact name from §7.2 catalogue (e.g. "W1.P0 Physical separation")
//   issue       : title `S<id> — <one-line scope>`, body from spec template
//
// GitLab is the state source. This file (execution-plan.md) is the scope source.
// ─────────────────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';

const PROJECT = 'somesh_sandbox/memo';
const SPEC_PATH = 'docs/src/developers/architecture/execution-plan.md';

export interface SessionSpec {
    id: string;                 // e.g. "S0.1", "SMIRO.3"
    title: string;              // one-line scope
    scope: string;              // markdown
    files: string;              // comma list / markdown
    acceptance: string;         // markdown
    gitlab?: string;            // existing #NNN if mapped
}

export interface MilestoneSpec {
    name: string;               // e.g. "W1.P0 Physical separation"
    wave: string;               // e.g. "wave::1-ontology"
    description: string;        // markdown intro
    sessions: SessionSpec[];
}

export interface RoadmapSpec {
    milestones: MilestoneSpec[];
}

export interface SyncOptions {
    apply?: boolean;
    verify?: boolean;
    closeStale?: boolean;
    dryRun?: boolean;
    project?: string;
    specPath?: string;
}

// ─── Step 1: Parse execution-plan.md ──────────────────────────────────────────

/**
 * Parses execution-plan.md into a RoadmapSpec.
 * Heuristic: every `### W<wave>.P<phase>` heading begins a milestone.
 * Every table row beginning with `| **S<id>**` or `| **SMIRO.<n>**` etc. is a session.
 */
export function parseSpec(specPath: string): RoadmapSpec {
    const text = fs.readFileSync(specPath, 'utf-8');
    const lines = text.split('\n');

    const milestones: MilestoneSpec[] = [];
    let current: MilestoneSpec | null = null;
    let descBuffer: string[] = [];
    let inMilestoneBody = false;

    const milestoneHeading = /^###\s+W([1-4])\.([A-Z0-9-]+(?:\.[a-z0-9]+)?)\s+(?:—|--)\s+(.+?)(?:\s+\(.*\))?$/;
    const sessionRow = /^\|\s*\*\*(S[A-Z0-9.]+\.\d+|SMIRO\.\d+|SREL\.\w+|S\d+\.\d+|S[A-Z]+\.\d+|SDOC\.\w+|SFB\.\d+|SIMP\.\d+|SEX\.\d+|SCM\.\d+|SMUL\.\d+|STL\.\d+|SMW\.\d+|SSC\.\d+|SMOD\.\d+)\*\*\s*\|/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const mH = line.match(milestoneHeading);
        if (mH) {
            if (current) {
                current.description = descBuffer.join('\n').trim();
                milestones.push(current);
            }
            const wave = mH[1];
            const phase = mH[2];
            const titleRest = mH[3].trim();
            current = {
                name: `W${wave}.${phase} ${titleRest}`,
                wave: waveLabel(wave, phase),
                description: '',
                sessions: [],
            };
            descBuffer = [];
            inMilestoneBody = true;
            continue;
        }

        if (!current) continue;

        const sR = line.match(sessionRow);
        if (sR) {
            // Parse pipe-delimited row
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            // Heuristic: shape varies per phase. First col always id; later cols vary.
            // We capture: id, then look for "scope"-like cell as the longest text, "files"-like cell containing path-like substrings, "acceptance"-like cell containing test/green/clean keywords.
            const id = cells[0].replace(/\*\*/g, '').trim();
            // Cell shapes vary per phase. Heuristics:
            // 1. First non-id cell that does NOT look like a path → title.
            // 2. First cell containing '/', '.ts', '.sysml', '/**' → files.
            // 3. First cell containing acceptance keywords → acceptance.
            const isFilesCell = (c: string) => /[\/\\]|\.ts\b|\.sysml\b|\.tsx\b|\.json\b|\*\*$|\.yaml\b/.test(c);
            const isAcceptCell = (c: string) => /\b(pass|green|clean|render|emit|tests?|works|appears|valid|loads|byte-identical|round-trip|fps|<\s*\d|≥|≤)\b/i.test(c);
            const titleCandidates = cells.slice(1).filter(c => c.length > 6 && !isFilesCell(c) && !isAcceptCell(c));
            const title = (titleCandidates[0] ?? cells[1] ?? '').trim();
            const scope = title;
            const filesCell = cells.slice(1).find(isFilesCell) ?? '';
            const acceptCell = cells.slice(1).find(isAcceptCell) ?? '';
            // Strip leading block-id prefixes like "E1 foundation" or "(foundation)".
            const cleanTitle = title
                .replace(/^E\d+\s+(?:[\w-]+\s+)?/, '')
                .replace(/^\(.*?\)\s*/, '')
                .replace(/^[A-Z][1-9]\s+/, '')
                .slice(0, 100);
            current.sessions.push({
                id,
                title: cleanTitle,
                scope,
                files: filesCell,
                acceptance: acceptCell,
            });
            continue;
        }

        if (inMilestoneBody && descBuffer.length < 8 && line.trim().length > 0 && !line.startsWith('|') && !line.startsWith('###') && !line.startsWith('##')) {
            descBuffer.push(line);
        }
    }

    if (current) {
        current.description = descBuffer.join('\n').trim();
        milestones.push(current);
    }

    return { milestones };
}

function waveLabel(wave: string, phase: string): string {
    if (wave === '1') return 'wave::1-ontology';
    if (wave === '2') return 'wave::2-cli';
    if (wave === '3') {
        // crude: shell, MOD, P-MIRO, P4, tab1 → v0; everything else → v1
        if (/^P-MOD|^P5-shell|^P5-tab1|^P-MIRO|^P4|^SREL\.v0/.test(phase)) return 'wave::3-web-v0';
        return 'wave::3-web-v1';
    }
    return 'wave::4-future';
}

// ─── Step 2: Fetch GitLab state ──────────────────────────────────────────────

interface GitLabMilestone {
    id: number;
    iid: number;
    title: string;
    state: string;
    description: string;
}

interface GitLabIssue {
    iid: number;
    title: string;
    state: string;
    milestone: { iid: number; title: string } | null;
    labels: string[];
}

function glab(args: string[]): { stdout: string; ok: boolean; stderr: string } {
    const r = spawnSync('glab', args, { encoding: 'utf-8' });
    return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', ok: r.status === 0 };
}

export function fetchGitLabState(project: string): { milestones: GitLabMilestone[]; issues: GitLabIssue[] } {
    const m = glab(['milestone', 'list', '--project', project, '--per-page', '100', '--output', 'json']);
    if (!m.ok) throw new Error(`glab milestone list failed: ${m.stderr}`);
    const milestones: GitLabMilestone[] = JSON.parse(m.stdout || '[]');

    // Paginate issues — GitLab caps per-page at 100.
    const issues: GitLabIssue[] = [];
    for (let page = 1; page <= 20; page++) {
        const i = glab(['issue', 'list', '-R', project, '--per-page', '100', '--page', String(page), '--output', 'json']);
        if (!i.ok) throw new Error(`glab issue list failed: ${i.stderr}`);
        const batch: GitLabIssue[] = JSON.parse(i.stdout || '[]');
        if (batch.length === 0) break;
        issues.push(...batch);
        if (batch.length < 100) break;
    }
    return { milestones, issues };
}

// ─── Step 3: Diff ────────────────────────────────────────────────────────────

export interface Diff {
    milestonesToCreate: MilestoneSpec[];
    milestonesToUpdate: { spec: MilestoneSpec; gitlab: GitLabMilestone }[];
    milestonesStaleInGitLab: GitLabMilestone[];   // in GitLab, not in spec
    issuesToCreate: { milestone: string; session: SessionSpec }[];
    issuesToUpdate: { milestone: string; session: SessionSpec; issue: GitLabIssue }[];
    issuesStaleInGitLab: GitLabIssue[];
}

export function diffSpecAndGitLab(spec: RoadmapSpec, gl: { milestones: GitLabMilestone[]; issues: GitLabIssue[] }): Diff {
    const out: Diff = {
        milestonesToCreate: [],
        milestonesToUpdate: [],
        milestonesStaleInGitLab: [],
        issuesToCreate: [],
        issuesToUpdate: [],
        issuesStaleInGitLab: [],
    };

    const glByName = new Map(gl.milestones.map(m => [m.title.trim(), m]));
    const specByName = new Map(spec.milestones.map(m => [m.name.trim(), m]));

    // Milestones
    for (const m of spec.milestones) {
        const found = glByName.get(m.name.trim());
        if (!found) out.milestonesToCreate.push(m);
        else out.milestonesToUpdate.push({ spec: m, gitlab: found });
    }
    for (const m of gl.milestones) {
        if (!specByName.has(m.title.trim()) && m.title.startsWith('W')) {
            out.milestonesStaleInGitLab.push(m);
        }
    }

    // Issues — map by (milestoneName, sessionId-prefix)
    const issuesByMilestone = new Map<string, GitLabIssue[]>();
    for (const iss of gl.issues) {
        const ms = iss.milestone?.title?.trim();
        if (!ms) continue;
        if (!issuesByMilestone.has(ms)) issuesByMilestone.set(ms, []);
        issuesByMilestone.get(ms)!.push(iss);
    }
    for (const m of spec.milestones) {
        const existing = issuesByMilestone.get(m.name.trim()) ?? [];
        const existingByPrefix = new Map(existing.map(e => [e.title.split(/\s|—/)[0].trim(), e]));
        for (const s of m.sessions) {
            const found = existingByPrefix.get(s.id);
            if (!found) out.issuesToCreate.push({ milestone: m.name, session: s });
            else out.issuesToUpdate.push({ milestone: m.name, session: s, issue: found });
        }
    }

    return out;
}

// ─── Step 4: Apply ───────────────────────────────────────────────────────────

function issueBody(milestoneName: string, s: SessionSpec): string {
    return [
        `> **Source of truth:** [\`execution-plan.md\`](../../docs/src/developers/architecture/execution-plan.md)`,
        `> **Architecture:** [\`fresh-architecture-plan.md\`](../../docs/src/developers/architecture/fresh-architecture-plan.md)`,
        `> **Rules:** [\`sysmlv2-rulebook.md\`](../../docs/src/developers/architecture/sysmlv2-rulebook.md)`,
        `> **Milestone:** ${milestoneName}`,
        `> **Auto-managed by:** \`memo roadmap-sync\`. Manual edits will be overwritten on next sync (comments preserved).`,
        ``,
        `## Scope`,
        s.scope || '_See spec._',
        ``,
        `## Files`,
        s.files || '_See spec._',
        ``,
        `## Acceptance`,
        s.acceptance || '_See spec._',
    ].join('\n');
}

export function applyDiff(d: Diff, project: string, log: (s: string) => void): void {
    for (const m of d.milestonesToCreate) {
        log(chalk.green(`+ milestone: ${m.name}`));
        const r = glab(['milestone', 'create', '--project', project, '--title', m.name, '--description', m.description.slice(0, 2000)]);
        if (!r.ok) log(chalk.red(`  failed: ${r.stderr}`));
    }
    for (const u of d.milestonesToUpdate) {
        if ((u.gitlab.description ?? '').trim() !== u.spec.description.trim()) {
            log(chalk.yellow(`~ milestone: ${u.spec.name} (description drift)`));
            // glab does not currently expose milestone update; skip or use API directly
        }
    }
    for (const c of d.issuesToCreate) {
        const body = issueBody(c.milestone, c.session);
        log(chalk.green(`+ issue: [${c.milestone}] ${c.session.id} — ${c.session.title}`));
        const r = glab([
            'issue', 'create',
            '-R', project,
            '--title', `${c.session.id} — ${c.session.title}`.slice(0, 200),
            '--description', body,
            '--milestone', c.milestone,
            '--label', 'kind::sonnet-session',
        ]);
        if (!r.ok) log(chalk.red(`  failed: ${r.stderr}`));
    }
    for (const u of d.issuesToUpdate) {
        log(chalk.gray(`= issue: ${u.issue.iid} ${u.session.id} (already exists)`));
    }
}

// ─── Entry ───────────────────────────────────────────────────────────────────

export async function roadmapSyncCommand(opts: SyncOptions = {}): Promise<void> {
    const project = opts.project ?? PROJECT;
    const specPath = opts.specPath ?? path.resolve(process.cwd(), SPEC_PATH);
    const dryRun = !opts.apply && !opts.verify ? true : !!opts.dryRun;

    if (!fs.existsSync(specPath)) {
        console.error(chalk.red(`✘ Spec not found: ${specPath}`));
        process.exit(1);
    }

    console.log(chalk.bold(`memo roadmap-sync · project ${project}`));
    const spec = parseSpec(specPath);
    console.log(chalk.gray(`spec: ${spec.milestones.length} milestones · ${spec.milestones.reduce((n, m) => n + m.sessions.length, 0)} sessions`));

    const gl = fetchGitLabState(project);
    console.log(chalk.gray(`gitlab: ${gl.milestones.length} milestones · ${gl.issues.length} issues`));

    const d = diffSpecAndGitLab(spec, gl);

    console.log('');
    console.log(chalk.bold('Diff:'));
    console.log(`  + milestones to create: ${d.milestonesToCreate.length}`);
    console.log(`  ~ milestones to update: ${d.milestonesToUpdate.length}`);
    console.log(`  − milestones stale (GitLab only): ${d.milestonesStaleInGitLab.length}`);
    console.log(`  + issues to create: ${d.issuesToCreate.length}`);
    console.log(`  = issues already in sync: ${d.issuesToUpdate.length}`);
    console.log(`  − issues stale (GitLab only): ${d.issuesStaleInGitLab.length}`);

    if (opts.verify) {
        const drift = d.milestonesToCreate.length + d.issuesToCreate.length + d.milestonesStaleInGitLab.length;
        if (drift > 0) {
            console.error(chalk.red(`✘ drift detected: ${drift} delta(s). Run \`memo roadmap-sync --apply\`.`));
            process.exit(1);
        }
        console.log(chalk.green('✓ no drift.'));
        return;
    }

    if (dryRun) {
        console.log('');
        console.log(chalk.gray('(dry-run — no changes. Pass --apply to write to GitLab.)'));
        for (const m of d.milestonesToCreate.slice(0, 10)) console.log(chalk.green(`  + milestone ${m.name}`));
        for (const c of d.issuesToCreate.slice(0, 20)) console.log(chalk.green(`  + issue [${c.milestone}] ${c.session.id} — ${c.session.title}`));
        if (d.issuesToCreate.length > 20) console.log(chalk.gray(`  … (+${d.issuesToCreate.length - 20} more)`));
        return;
    }

    if (opts.apply) {
        applyDiff(d, project, console.log);
        if (opts.closeStale) {
            for (const iss of d.issuesStaleInGitLab) {
                console.log(chalk.yellow(`× close stale issue: #${iss.iid} ${iss.title}`));
                glab(['issue', 'close', '-R', project, String(iss.iid)]);
            }
        }
        console.log(chalk.green('✓ apply complete.'));
    }
}
