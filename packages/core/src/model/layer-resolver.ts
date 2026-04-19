// ─── Layer Resolver ──────────────────────────────────────────────────────────
//
// Derives architecture layer from a SysML file's directory path.
// Convention: sysml/<layer>/<file>.sysml → layer name.
// The "relationships" directory maps to "crosscutting".
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the architecture layer from a SysML file path.
 *
 * Uses the Apollo-11 convention: the immediate subdirectory under `sysml/`
 * determines the layer. The `relationships/` directory is special-cased
 * to "crosscutting" since relationships span layers.
 *
 * @example
 * resolveLayerFromPath("sysml/risk/risk-management.sysml")     → "risk"
 * resolveLayerFromPath("sysml/operational/operational.sysml")   → "operational"
 * resolveLayerFromPath("sysml/relationships/relationships.sysml") → "crosscutting"
 * resolveLayerFromPath("sysml/operational/purpose/business.sysml") → "operational"
 */
export function resolveLayerFromPath(filePath: string): string {
    // Normalize to forward slashes
    const normalized = filePath.replace(/\\/g, '/');

    // Handle both "sysml/..." (relative) and ".../sysml/..." (absolute)
    let afterSysml: string;
    const slashSysmlIndex = normalized.indexOf('/sysml/');
    if (slashSysmlIndex !== -1) {
        afterSysml = normalized.substring(slashSysmlIndex + 7);
    } else if (normalized.startsWith('sysml/')) {
        afterSysml = normalized.substring(6);
    } else {
        return 'unknown';
    }
    const layerDir = afterSysml.split('/')[0];

    if (!layerDir || layerDir.endsWith('.sysml')) {
        // File is directly under sysml/ (e.g. index.sysml) — no layer
        return 'unknown';
    }

    return layerDir === 'relationships' ? 'crosscutting' : layerDir;
}
