// @memo/ontology-medical-process — re-exports for programmatic access.
// The primary ontology content is in sysml/ (SysML v2 definitions).
export const ONTOLOGY_MEDICAL_PROCESS_VERSION = '0.2.0';

export { exportToOwlTurtle, exportToOwlXml } from './export/owl-exporter.js';
export type { OntologyConfig } from './export/owl-exporter.js';
