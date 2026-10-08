// ─── memo-architect config set / get / unset ─────────────────────────────────
//
// Settings are Architect's: the compiler a project uses, and the one a user
// prefers for themselves. MEMO Tools has no settings commands (it compiles and
// validates); it reads what these write. Which settings a user is shown, and
// which are whose, is the registry's answer (MEMO Tools'
// `toolchain/user-settings-status.ts`), the same code Architect's Compiler
// control calls, so the command line and the browser cannot disagree.
// ─────────────────────────────────────────────────────────────────────────────

import {
    applyProjectSetting, applyUserSetting, ConfigSettingError, defaultRegistry, loadProjectSettings,
    userLeaf, userSettingReports, userSettingsPath, USER_COMPILER_ENV,
} from '@memoarchitect/tools';

export { ConfigSettingError };

/** Set a setting for yourself, or with `project` for the whole project (its checked-in settings file). */
export function configSetCommand(path: string, value: string, project?: { root: string }): void {
    if (project) {
        const { file } = applyProjectSetting(project.root, path, value, defaultRegistry);
        console.log((`Set toolchain.${path} = ${value}`) + (` in the project's ${file}; commit it so everyone on the project uses it`));
        return;
    }
    const { file } = applyUserSetting(path, value, defaultRegistry);
    console.log((`Set toolchain.${path} = ${value}`) + (` in ${file}`));
    if (path === 'compiler' && process.env[USER_COMPILER_ENV]?.trim()) {
        console.log((`  ${USER_COMPILER_ENV} is set in this shell and beats the file: ${process.env[USER_COMPILER_ENV]}.`));
    }
}

/** Remove a setting of your own, or with `project` the project's. */
export function configUnsetCommand(path: string, project?: { root: string }): void {
    if (project) {
        const { file, changed } = applyProjectSetting(project.root, path, undefined, defaultRegistry);
        console.log(changed
            ? (`Removed toolchain.${path}`) + (` from the project's ${file}`)
            : (`toolchain.${path} was not set in the project's ${file}`));
        return;
    }
    const { changed } = applyUserSetting(path, undefined, defaultRegistry);
    console.log(changed
        ? (`Removed toolchain.${path}`) + (` from ${userSettingsPath()}`)
        : (`toolchain.${path} was not set in ${userSettingsPath()}`));
}

/** Your settings and the layer that decided each: the command line, the environment, yours, the project's. */
export function configGetCommand(path: string | undefined, options: { all?: boolean; projectRoot?: string } = {}): void {
    if (path) userLeaf(path, defaultRegistry);
    const project = loadProjectSettings(options.projectRoot ?? process.cwd()).projectToolchain ?? {};
    const reports = userSettingReports(defaultRegistry, {}, process.env, project, options.all === true || path !== undefined)
        .filter(report => !path || report.path === path);
    console.log((`  your settings: ${userSettingsPath()}`));
    for (const report of reports) {
        const left = `toolchain.${report.path}`.padEnd(30);
        if (!report.layer) {
            console.log(`  ${left} ${('(not set)')}`);
            continue;
        }
        const others = report.layers.slice(1).map(l => `${l.layer}: ${l.value}`).join('; ');
        console.log(`  ${left} ${report.value}  ${(`(${report.layer}${others ? `; overrides ${others}` : ''})`)}`);
    }
}
