// ─── DHF Document Categories ──────────────────────────────────────────────────
//
// Registry of the built-in document categories and their meMO templates.
// Shared by the DHF explorer (grouping, colors) and the New Document wizard.
// Users can also file documents under a custom "Other" category.
// ─────────────────────────────────────────────────────────────────────────────

export interface DhfTemplate { id: string; title: string; prefix: string; }

export interface DhfGroup {
    id: string;
    label: string;
    color: string;
    templates: DhfTemplate[];
}

export const DHF_GROUPS: DhfGroup[] = [
    {
        id: 'risk', label: 'Risk Management', color: '#dc2626',
        templates: [
            { id: 'iso-14971/rmp', title: 'Risk Management Plan', prefix: 'RMP' },
            { id: 'iso-14971/har', title: 'Hazard Analysis Report', prefix: 'HAR' },
            { id: 'iso-14971/fmea', title: 'FMEA', prefix: 'FMEA' },
            { id: 'iso-14971/fta', title: 'Fault Tree Analysis', prefix: 'FTA' },
            { id: 'iso-14971/risk-benefit', title: 'Risk-Benefit Analysis', prefix: 'RBA' },
            { id: 'iso-14971/rmr', title: 'Risk Management Report', prefix: 'RMR' },
        ],
    },
    {
        id: 'software', label: 'Software', color: '#2563eb',
        templates: [
            { id: 'iec-62304/sdp', title: 'Software Development Plan', prefix: 'SDP' },
            { id: 'iec-62304/srs', title: 'Software Requirements Spec', prefix: 'SRS' },
            { id: 'iec-62304/sad', title: 'Software Architecture Description', prefix: 'SAD' },
            { id: 'iec-62304/detailed-design', title: 'Software Detailed Design', prefix: 'DDS' },
            { id: 'iec-62304/integration-test', title: 'Integration Test Plan', prefix: 'ITP' },
            { id: 'iec-62304/system-test', title: 'System Test Plan', prefix: 'STP' },
            { id: 'iec-62304/soup', title: 'SOUP List', prefix: 'SOUP' },
            { id: 'iec-62304/sbom', title: 'Software Bill of Materials', prefix: 'SBOM' },
            { id: 'iec-62304/sw-traceability', title: 'SW Traceability Matrix', prefix: 'STM' },
            { id: 'iec-62304/change-control', title: 'Change Control Log', prefix: 'CCL' },
        ],
    },
    {
        id: 'usability', label: 'Usability', color: '#7c3aed',
        templates: [
            { id: 'iec-62366/ue-plan', title: 'Usability Engineering Plan', prefix: 'UEP' },
            { id: 'iec-62366/use-spec', title: 'Intended Use Specification', prefix: 'USE' },
            { id: 'iec-62366/ui-spec', title: 'User Interface Specification', prefix: 'UIS' },
            { id: 'iec-62366/task-analysis', title: 'Task Analysis', prefix: 'TA' },
            { id: 'iec-62366/urra', title: 'Use-Related Risk Analysis', prefix: 'URRA' },
            { id: 'iec-62366/formative-eval', title: 'Formative Evaluation', prefix: 'FE' },
            { id: 'iec-62366/summative-eval', title: 'Summative Evaluation', prefix: 'SE' },
        ],
    },
    {
        id: 'requirements', label: 'Requirements', color: '#0891b2',
        templates: [
            { id: '21cfr820/user-needs', title: 'User Needs', prefix: 'UN' },
            { id: '21cfr820/design-input', title: 'Design Input Specification', prefix: 'DIS' },
            { id: '21cfr820/design-output', title: 'Design Output Specification', prefix: 'DOS' },
        ],
    },
    {
        id: 'vv', label: 'Verification & Validation', color: '#0d9488',
        templates: [
            { id: '21cfr820/vv-plan', title: 'V&V Plan', prefix: 'VVP' },
            { id: '21cfr820/vv-report', title: 'V&V Report', prefix: 'VVR' },
            { id: '21cfr820/design-verification', title: 'Design Verification Report', prefix: 'DVR' },
            { id: '21cfr820/design-validation', title: 'Design Validation Report', prefix: 'DVAR' },
            { id: '21cfr820/design-review', title: 'Design Review Record', prefix: 'DRR' },
        ],
    },
    {
        id: 'release', label: 'Release & Change', color: '#4f46e5',
        templates: [
            { id: '21cfr820/transfer-plan', title: 'Design Transfer Plan', prefix: 'DTP' },
            { id: '21cfr820/change-record', title: 'Design Change Record', prefix: 'DCR' },
            { id: '21cfr820/dhf-index', title: 'DHF Index', prefix: 'DHF' },
        ],
    },
    {
        id: 'system', label: 'System', color: '#059669',
        templates: [
            { id: 'system/srs', title: 'System Requirements Specification', prefix: 'SRS' },
            { id: 'system/sad', title: 'System Architecture Description', prefix: 'SyAD' },
            { id: 'system/sds', title: 'System Design Specification', prefix: 'SDS' },
            { id: 'system/icd', title: 'Interface Control Document', prefix: 'ICD' },
            { id: 'system/svvp', title: 'System V&V Plan', prefix: 'SVVP' },
            { id: 'system/svvr', title: 'System V&V Report', prefix: 'SVVR' },
        ],
    },
    {
        id: 'hardware', label: 'Hardware', color: '#b45309',
        templates: [
            { id: 'hardware/hdp', title: 'Hardware Development Plan', prefix: 'HDP' },
            { id: 'hardware/hds', title: 'Hardware Design Specification', prefix: 'HDS' },
            { id: 'hardware/hvp', title: 'Hardware Verification Plan', prefix: 'HVP' },
            { id: 'hardware/hvr', title: 'Hardware Verification Report', prefix: 'HVR' },
            { id: 'hardware/hbom', title: 'Hardware Bill of Materials', prefix: 'HBOM' },
            { id: 'hardware/haz', title: 'Hardware Hazard Analysis', prefix: 'HHA' },
        ],
    },
    {
        id: 'cybersecurity', label: 'Cybersecurity', color: '#d97706',
        templates: [
            { id: 'fda-cybersecurity/threat-model', title: 'Threat Model', prefix: 'TM' },
            { id: 'fda-cybersecurity/security-arch', title: 'Security Architecture', prefix: 'SA' },
            { id: 'fda-cybersecurity/vuln-assessment', title: 'Vulnerability Assessment', prefix: 'VA' },
            { id: 'fda-cybersecurity/postmarket-surveillance', title: 'Post-Market Surveillance', prefix: 'PMS' },
            { id: 'fda-cybersecurity/incident-response', title: 'Incident Response Plan', prefix: 'IRP' },
        ],
    },
];

/** Category id for user-defined categories that don't fit the built-in groups */
export const OTHER_GROUP_ID = 'other';
export const OTHER_GROUP_COLOR = '#6B7280';

/** Color for a group label, falling back to the Other color for custom categories */
export function groupColorForLabel(label: string): string {
    return DHF_GROUPS.find(g => g.label === label)?.color ?? OTHER_GROUP_COLOR;
}

/**
 * Derive a document ID prefix from a title, e.g.
 * "Clinical Evaluation Report" → "CER", "Notes" → "NOT".
 */
export function prefixFromTitle(title: string): string {
    const words = title.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (words.length >= 2) return words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
    return 'DOC';
}
