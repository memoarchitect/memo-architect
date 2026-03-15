// @memo/ontology — re-exports for programmatic access
// The primary content is in sysml/ (SysML v2 definitions).
export const ONTOLOGY_VERSION = '2.0.0';

export { exportToOwlTurtle, exportToOwlXml } from './export/owl-exporter.js';
export type { OntologyConfig } from './export/owl-exporter.js';
