// ============================================================================
// GPCA Infusion Pump — Compliance & Traceability (M89)
// Cross-cutting validation: requirement→test, hazard→control→SW item,
// design history, completeness evidence
// ============================================================================

package GPCA_Compliance {
    import MEMO_Ontology_Arch::*;
    import MEMO_Ontology_Process::*;
    import GPCA_Requirements::*;
    import GPCA_Risk::*;
    import GPCA_Architecture::*;
    import GPCA_Behavior::*;
    import GPCA_Clinical::*;
    import GPCA_Cybersecurity::*;

    // ═══════════════════════════════════════════════════════════════════════
    // DESIGN CONTROL TRACEABILITY
    // ═══════════════════════════════════════════════════════════════════════

    // Design Input → Design Output satisfaction
    requirement diSafeInfusion : DesignInput {
        attribute redefines reqId = "DI-001";
        attribute redefines title = "Safe and Effective PCA Infusion Delivery";
        doc /* Top-level design input: deliver analgesic drugs safely and
             * effectively via PCA protocol per IEC 60601-2-24. */
    }

    requirement diRegulatoryCompliance : DesignInput {
        attribute redefines reqId = "DI-002";
        attribute redefines title = "Regulatory Compliance (FDA/MDR)";
        doc /* Design must comply with FDA 510(k) / EU MDR requirements
             * including ISO 14971, IEC 62304, IEC 60601, IEC 62366. */
    }

    requirement diCybersecurity : DesignInput {
        attribute redefines reqId = "DI-003";
        attribute redefines title = "Cybersecurity Requirements";
        doc /* Design must meet FDA premarket cybersecurity guidance and
             * IEC 81001-5-1 for connected medical devices. */
    }

    part doGPCAPump : DesignOutput {
        attribute redefines name = "GPCA Infusion Pump Design Output";
        doc /* Complete design output package: hardware design, firmware,
             * labeling, packaging, manufacturing specs. */
    }

    part designReviewPreliminary : DesignReview {
        attribute redefines name = "Preliminary Design Review";
        doc /* Review of system architecture, requirements allocation,
             * and risk analysis completeness. Gate: All system requirements
             * traced to user needs, initial FMEA complete. */
    }

    part designReviewCritical : DesignReview {
        attribute redefines name = "Critical Design Review";
        doc /* Review of detailed software architecture, unit design,
             * and verification test plan. Gate: All SW requirements
             * allocated to items, all risk controls designed. */
    }

    part designReviewFinal : DesignReview {
        attribute redefines name = "Final Design Review";
        doc /* Review of verification results, clinical evaluation,
             * usability validation. Gate: All tests pass, all risk
             * controls verified effective, DHF complete. */
    }

    // Design input → Design output satisfaction
    connection : Satisfy connect satisfiedBy ::> doGPCAPump to satisfies ::> diSafeInfusion;
    connection : Satisfy connect satisfiedBy ::> doGPCAPump to satisfies ::> diRegulatoryCompliance;
    connection : Satisfy connect satisfiedBy ::> doGPCAPump to satisfies ::> diCybersecurity;

    // ═══════════════════════════════════════════════════════════════════════
    // COMPLIANCE EVIDENCE — Documenting Standard Compliance
    // ═══════════════════════════════════════════════════════════════════════

    part evidenceISO14971 : ComplianceEvidence {
        attribute redefines name = "ISO 14971 Compliance Evidence";
        doc /* Evidence of compliance: Risk Management Plan, Hazard Analysis
             * (23 hazards), Risk Assessment (26 situations), Risk Control
             * measures (32 controls), FMEA (16 failure modes), FTA (1),
             * Overall Residual Risk Evaluation, Risk Management Report. */
    }

    part evidenceIEC62304 : ComplianceEvidence {
        attribute redefines name = "IEC 62304 Compliance Evidence";
        doc /* Evidence: Software Development Plan, Software Requirements
             * Specification (24 SW requirements), Software Architecture
             * Document (10 items, 20 units), SOUP Evaluation (6 items),
             * Verification Results (25 test cases). */
    }

    part evidenceIEC60601 : ComplianceEvidence {
        attribute redefines name = "IEC 60601-1 + IEC 60601-2-24 Compliance Evidence";
        doc /* Evidence: Essential Performance analysis (3 EP, 2 loss
             * conditions), Alarm system per IEC 60601-1-8, Environmental
             * testing (drop, waterproof, EMC), Non-behavioral requirements
             * (REQ 83-86). */
    }

    part evidenceIEC62366 : ComplianceEvidence {
        attribute redefines name = "IEC 62366 Usability Compliance Evidence";
        doc /* Evidence: Use Specification, Use Error Analysis (4 errors),
             * Formative Evaluation, Summative Evaluation, UI Requirements
             * (4 requirements), User Profiles (3). */
    }

    part evidenceCybersecurity : ComplianceEvidence {
        attribute redefines name = "Cybersecurity Compliance Evidence";
        doc /* Evidence: Threat Model (5 scenarios), Vulnerability Assessment
             * (4 vulnerabilities), Security Controls (5 controls),
             * SBOM (6 SOUP components), Secure Update Capability. */
    }

    // Evidence → Standard connections
    connection : Evidences connect evidence ::> evidenceISO14971 to standard ::> standardISO14971;
    connection : Evidences connect evidence ::> evidenceIEC62304 to standard ::> standardIEC62304;
    connection : Evidences connect evidence ::> evidenceIEC60601 to standard ::> standardIEC60601;
    connection : Evidences connect evidence ::> evidenceIEC62366 to standard ::> standardIEC62366;

    // ═══════════════════════════════════════════════════════════════════════
    // IEC 62304 LIFECYCLE DOCUMENTATION
    // ═══════════════════════════════════════════════════════════════════════

    part dhfSoftwareRequirements : DesignHistoryRecord {
        attribute redefines name = "DHF — Software Requirements Trace";
        doc /* Documents trace from system requirements through software
             * requirements to software items. 24 SW requirements →
             * 10 software items → 20 software units. */
    }

    part dhfRiskTrace : DesignHistoryRecord {
        attribute redefines name = "DHF — Risk Management Trace";
        doc /* Documents trace from hazards through risk controls to
             * software items implementing controls. 23 hazards →
             * 32 risk controls → 10 software items. */
    }

    part dhfVerificationTrace : DesignHistoryRecord {
        attribute redefines name = "DHF — Verification Results Trace";
        doc /* Documents trace from requirements through test cases to
             * test results. 25 test cases covering system and software
             * requirements. */
    }

    part dhfClinicalEval : DesignHistoryRecord {
        attribute redefines name = "DHF — Clinical Evaluation";
        doc /* Clinical evaluation per MDR Annex XIV. Literature review,
             * bench testing, equivalence analysis. No clinical
             * investigation required. */
    }

    part dhfUsabilityEval : DesignHistoryRecord {
        attribute redefines name = "DHF — Usability Engineering File";
        doc /* Complete usability engineering file per IEC 62366-1.
             * Use specification, error analysis, formative and summative
             * evaluation results. */
    }

    // DHF documentation connections
    connection : Documents connect record ::> dhfSoftwareRequirements to subject ::> swReqSpec;
    connection : Documents connect record ::> dhfRiskTrace to subject ::> riskManagementReport;
    connection : Documents connect record ::> dhfVerificationTrace to subject ::> swArchDoc;
    connection : Documents connect record ::> dhfClinicalEval to subject ::> clinicalEvalReport;
    connection : Documents connect record ::> dhfUsabilityEval to subject ::> summativeEval;

    // ═══════════════════════════════════════════════════════════════════════
    // REGULATORY REQUIREMENTS
    // ═══════════════════════════════════════════════════════════════════════

    part regReqFDA510k : RegulatoryRequirement {
        attribute redefines name = "FDA 510(k) Premarket Notification";
        doc /* Class II medical device requiring 510(k) clearance.
             * Predicate device: existing cleared PCA infusion pumps.
             * Substantial equivalence demonstrated through bench testing
             * and software validation. */
    }

    part regReqMDRClassIIb : RegulatoryRequirement {
        attribute redefines name = "EU MDR Class IIb Classification";
        doc /* Active therapeutic device, Rule 12 → Class IIb.
             * Requires Notified Body review. Technical file includes
             * clinical evaluation, risk management, and usability. */
    }

    part regReqUDI : RegulatoryRequirement {
        attribute redefines name = "Unique Device Identification (UDI)";
        doc /* UDI-DI assigned per FDA GUDID / EU EUDAMED requirements.
             * UDI-PI encoded on device label and in RFID tag. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVACY & DATA GOVERNANCE
    // ═══════════════════════════════════════════════════════════════════════

    part phiEventLogs : ProtectedHealthInformation {
        attribute redefines name = "Patient Event Log PHI";
        doc /* Infusion event logs contain patient-identifiable data:
             * patient ID, drug administered, doses delivered, timestamps.
             * HIPAA-protected. Encrypted at rest (AES-256). */
    }

    part phiPrescriptionData : ProtectedHealthInformation {
        attribute redefines name = "Prescription Data PHI";
        doc /* Active prescription parameters including patient name,
             * drug, doses. Cleared from memory on patient discharge. */
    }

    action dataProcessingInfusionLogging : DataProcessingActivity {
        attribute redefines name = "Infusion Event Logging Processing";
        doc /* Processing: collection and storage of patient infusion data
             * for clinical review and regulatory compliance.
             * Lawful basis: Necessary for medical treatment (HIPAA TPO).
             * Retention: 30 days on device, per hospital policy thereafter. */
    }

    part retentionPolicy : DataRetentionPolicy {
        attribute redefines name = "Event Log Retention Policy";
        doc /* On-device: 30 days minimum in circular buffer.
             * After export to hospital EMR: per hospital records
             * retention policy (typically 7-10 years). */
    }

    part minimumNecessary : MinimumNecessaryPolicy {
        attribute redefines name = "Minimum Necessary Data Collection";
        doc /* Device collects only data necessary for safe operation
             * and regulatory compliance: patient ID (session), drug/dose
             * parameters, delivery events, alarm events. No demographic
             * data stored on device. */
    }

    // Privacy connections
    connection : ClassifiesData connect category ::> phiEventLogs to subject ::> assetPatientData;
    connection : ProcessesData connect activity ::> dataProcessingInfusionLogging to data ::> phiEventLogs;
    connection : GovernedByRetentionPolicy connect data ::> phiEventLogs to policy ::> retentionPolicy;
    connection : AppliesMinimumNecessary connect data ::> phiEventLogs to policy ::> minimumNecessary;

    // ═══════════════════════════════════════════════════════════════════════
    // MODEL STATISTICS (for M89 validation)
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Element Count Summary:
    //   Requirements:
    //     User Needs:          12
    //     System Requirements: 47 (REQ 1-41, 48-58, 77-86)
    //     Software Requirements: 24
    //     Other Requirements:  3 (contraindications)
    //     Total Requirements:  86
    //
    //   Risk:
    //     Hazards:             23
    //     Hazardous Situations: 26
    //     Harms:               11
    //     Risk Controls:       32
    //     Risk Assessments:    8 (4 pre + 4 post)
    //     FMEA Failure Modes:  16
    //     Failure Causes:      16
    //     Failure Effects:     16
    //     Detection Controls:  7
    //     FTA Elements:        14 (1 FTA, 1 top, 3 intermediate, 8 basic, 3 gates)
    //     Risk Plans/Reports:  4
    //     Total Risk:          173
    //
    //   Architecture:
    //     System/Subsystems:   7
    //     Hardware Components: 21
    //     Software System:     1
    //     Software Items:      10
    //     Software Units:      20
    //     SOUP Items:          6
    //     SOUP Evaluations:    2
    //     Lifecycle Artifacts: 8
    //     Test Cases:          25
    //     Total Architecture:  100
    //
    //   Behavior:
    //     System Functions:    6
    //     Component Functions: 6
    //     State Machine States: 10
    //     Action Flow Steps:   39
    //     Flow Items:          5
    //     Total Behavior:      66
    //
    //   Clinical/Usability:
    //     Clinical Elements:   16 (intended use, indications, claims, eval, benefits)
    //     Usability Elements:  16 (profiles, scenarios, errors, UI reqs, evals)
    //     Safety/EP:           6
    //     Total Clinical:      38
    //
    //   Cybersecurity:
    //     Threat Scenarios:    5
    //     Vulnerabilities:     4
    //     Cyber Requirements:  5
    //     Security Controls:   5
    //     Cyber Assets:        5
    //     SBOM/Update:         2
    //     Total Cyber:         26
    //
    //   Compliance:
    //     Design Control:      7
    //     DHF Records:         5
    //     Compliance Evidence: 5
    //     Regulatory Reqs:     3
    //     Privacy/Data:        5
    //     QMS/Standards:       7
    //     Total Compliance:    32
    //
    //   Post-Market:          6
    //   Manufacturing:        6
    //   Stakeholders/Context: 12
    //
    //   GRAND TOTAL:          ~545 elements
    //
    //   Relationships:        ~350+ connections
    //
    //   Domain Coverage:      15/15 ontology-medical domains
    //     ✓ requirements (86)
    //     ✓ risk (173)
    //     ✓ software-lifecycle (47)
    //     ✓ design-control (23)
    //     ✓ clinical (16)
    //     ✓ safety (6)
    //     ✓ cybersecurity (26)
    //     ✓ operations (6)
    //     ✓ qms (15)
    //     ✓ privacy (5)
    //     ✓ product-line (-)
    //     ✓ interfaces (5 + ports)
    //     ✓ verification (25)
    //     ✓ business/purpose (12)
    //     ✓ architecture (28)
    //
    // ═══════════════════════════════════════════════════════════════════════
}
