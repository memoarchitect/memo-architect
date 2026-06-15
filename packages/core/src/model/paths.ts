// ─── Repo Layout Paths ─────────────────────────────────────────────────────────
//
// Single source of truth for the vendored ontology submodule location.
// The MEMO ontology content (base/ontology/methodology, pure SysML v2) is pulled
// in as a git submodule mounted under `vendor/`. Its on-disk directory name is
// deliberately independent of the GitLab project name — if the checkout location
// ever changes, update VENDOR_SUBMODULE_NAME here and the `path` in `.gitmodules`
// (plus the non-TS references in pnpm-workspace.yaml, tools/, and scripts/).
// ───────────────────────────────────────────────────────────────────────────────

/** Directory name of the vendored ontology submodule, under `vendor/`. */
export const VENDOR_SUBMODULE_NAME = 'memo-sysmlv2';

/** Relative path (from repo root) to the vendored ontology submodule. */
export const VENDOR_ONTOLOGY_DIR = `vendor/${VENDOR_SUBMODULE_NAME}`;

/** Relative path (from repo root) to the submodule's `packages/` directory. */
export const VENDOR_ONTOLOGY_PACKAGES_DIR = `${VENDOR_ONTOLOGY_DIR}/packages`;

/**
 * Relative path (from repo root) to the submodule's `src/` content root.
 * All SysML v2 ontology/methodology/example content lives under `src/`, organized
 * to mirror the `memo::` namespace hierarchy (e.g. `src/architecture/context/`).
 * Package manifests point `sysmlDir` here; the loader walks it for catalog layers.
 */
export const VENDOR_ONTOLOGY_SRC_DIR = `${VENDOR_ONTOLOGY_DIR}/src`;
