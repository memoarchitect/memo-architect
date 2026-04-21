// ─── File Watcher ────────────────────────────────────────────────────────────
//
// Two-scope watchers: project files (hot reload) and ontology files (restart).
// ─────────────────────────────────────────────────────────────────────────────

import chokidar from 'chokidar';
import { resolve } from 'node:path';

export interface FileWatcher {
    close(): void;
}

const IGNORED_DIRS = ['**/node_modules/**', '**/.memo/**', '**/dist/**', '**/lib/**'];

function makeDebounced(onChange: () => void | Promise<void>, debounceMs: number) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            onChange();
        }, debounceMs);
    };
}

/**
 * Watch project source files — triggers hot rebuild.
 * Covers model SysML and per-project YAML config files only.
 */
export function createProjectWatcher(
    projectDir: string,
    onChange: () => void | Promise<void>,
    debounceMs: number = 300
): FileWatcher {
    const fire = makeDebounced(onChange, debounceMs);

    const watcher = chokidar.watch(
        [
            `${projectDir}/model/**/*.sysml`,
            `${projectDir}/memo.rendering.yaml`,
            `${projectDir}/memo.rules.yaml`,
            `${projectDir}/memo.viewpoints.yaml`,
        ],
        { ignored: IGNORED_DIRS, persistent: true, ignoreInitial: true }
    );

    watcher.on('all', fire);

    return {
        close() { watcher.close(); },
    };
}

/**
 * Watch ontology package files — triggers restart-required notification.
 * Covers: ontology sysml/, memo.package.yaml, memo.rendering.yaml in each root,
 * plus the project-level memo.config.yaml and model/ontology-selection.sysml.
 */
export function createOntologyWatcher(
    projectDir: string,
    ontologyRoots: string[],
    onChange: (changedFile: string) => void | Promise<void>,
    debounceMs: number = 300
): FileWatcher {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingFile = '';

    const fire = (filePath: string) => {
        if (!pendingFile) pendingFile = filePath;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            const f = pendingFile;
            pendingFile = '';
            onChange(f);
        }, debounceMs);
    };

    const patterns: string[] = [
        // Per-ontology-root patterns
        ...ontologyRoots.flatMap(root => [
            `${resolve(root)}/sysml/**/*.sysml`,
            `${resolve(root)}/memo.package.yaml`,
            `${resolve(root)}/memo.rendering.yaml`,
        ]),
        // Project-level ontology selection
        `${projectDir}/memo.config.yaml`,
        `${projectDir}/memo.config.yml`,
        `${projectDir}/memo.package.yaml`,
        `${projectDir}/model/ontology-selection.sysml`,
    ];

    const watcher = chokidar.watch(patterns, {
        ignored: IGNORED_DIRS,
        persistent: true,
        ignoreInitial: true,
    });

    watcher.on('all', (_event, filePath) => fire(filePath));

    return {
        close() {
            if (timer) clearTimeout(timer);
            watcher.close();
        },
    };
}

/**
 * @deprecated Use createProjectWatcher + createOntologyWatcher instead.
 * Kept for backward compatibility.
 */
export function createFileWatcher(
    projectDir: string,
    onChange: () => void | Promise<void>,
    debounceMs: number = 300
): FileWatcher {
    const fire = makeDebounced(onChange, debounceMs);

    const watcher = chokidar.watch(
        [
            `${projectDir}/**/*.sysml`,
            `${projectDir}/**/memo.config.yaml`,
            `${projectDir}/**/memo.config.yml`,
            `${projectDir}/**/memo.package.yaml`,
            `${projectDir}/**/memo.rendering.yaml`,
            `${projectDir}/**/memo.rules.yaml`,
            `${projectDir}/**/memo.viewpoints.yaml`,
        ],
        { ignored: IGNORED_DIRS, persistent: true, ignoreInitial: true }
    );

    watcher.on('all', fire);

    return {
        close() { watcher.close(); },
    };
}
