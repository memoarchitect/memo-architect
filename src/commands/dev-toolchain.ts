// ─── Which compiler an Architect session uses ────────────────────────────────
//
// Architect is a SysML workbench, so its validity verdict comes from a real
// SysML compiler, never from MEMO's internal parser alone. When nothing
// chooses one — no `--toolchain.compiler` or `--toolchain.validator` flag, and
// no `compiler` or `validator` in the project's settings — the session
// validates with SysIDE, the compiler of record. A project or a caller that
// chose a compiler gets that compiler and no other: with OpenSysML selected,
// SysIDE is not run at all.
// ─────────────────────────────────────────────────────────────────────────────

import { findProjectRoot, loadProjectSettings } from '@memoarchitect/tools';

/** The validator a session uses when nothing else chose one. */
export const ARCHITECT_DEFAULT_VALIDATOR = 'syside';

/** Whether a toolchain block or flag set names a compiler or a validator. */
function choosesCompiler(values: Record<string, unknown>, prefix: string): boolean {
    return [`${prefix}compiler`, `${prefix}validator`].some(key => {
        const value = values[key];
        return typeof value === 'string' && value.length > 0;
    });
}

/**
 * The toolchain flags a dev session runs with: the caller's, plus SysIDE as
 * the validator only when neither the caller nor the project chose a compiler
 * or validator.
 */
export function architectDevToolchainOptions(
    selected: Record<string, unknown>,
    projectDir: string = process.cwd(),
): Record<string, unknown> {
    if (choosesCompiler(selected, 'toolchain.')) return selected;
    const root = findProjectRoot(projectDir) ?? projectDir;
    const settings = (loadProjectSettings(root).toolchain ?? {}) as Record<string, unknown>;
    if (choosesCompiler(settings, '')) return selected;
    return { ...selected, 'toolchain.validator': ARCHITECT_DEFAULT_VALIDATOR };
}
