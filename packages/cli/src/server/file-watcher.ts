// ─── File Watcher ────────────────────────────────────────────────────────────
//
// Watches .sysml and memo config files for changes using chokidar.
// Debounces rapid saves and triggers a callback on change.
// ─────────────────────────────────────────────────────────────────────────────

import chokidar from 'chokidar';

export interface FileWatcher {
    close(): void;
}

export function createFileWatcher(
    projectDir: string,
    onChange: () => void | Promise<void>,
    debounceMs: number = 300
): FileWatcher {
    let timer: ReturnType<typeof setTimeout> | null = null;

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
        {
            ignored: [
                '**/node_modules/**',
                '**/.memo/**',
                '**/dist/**',
                '**/lib/**',
            ],
            persistent: true,
            ignoreInitial: true,
        }
    );

    watcher.on('all', (_event, _path) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            onChange();
        }, debounceMs);
    });

    return {
        close() {
            if (timer) clearTimeout(timer);
            watcher.close();
        },
    };
}
