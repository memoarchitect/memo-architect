// @memo/ontology-core — re-exports for programmatic access
// The primary ontology content is in sysml/ (SysML v2 definitions).
export const ONTOLOGY_CORE_VERSION = '0.1.0';

export { exportToOwlTurtle, exportToOwlXml } from './export/owl-exporter.js';
export type { OntologyConfig } from './export/owl-exporter.js';
