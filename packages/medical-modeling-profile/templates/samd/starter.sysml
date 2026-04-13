// ============================================================================
// MEMO Medical — SaMD (Software as a Medical Device) Starter Template
// CoSMA-layered elements: purpose | requirements | risk | functional |
//   logical | software | interfaces | verification
//
// Archetype: Clinical decision support, diagnostic algorithm, AI/ML tool,
//   mobile medical app, patient monitoring software
// ============================================================================

package SaMD_Device {
    import MEMO_Ontology_Medical::*;

    // ═══════════════════════════════════════════════════════════════════════
    // PURPOSE LAYER — Who uses this and why?
    // ═══════════════════════════════════════════════════════════════════════

    part clinician : Actor {
        attribute redefines name = "Clinician";
        doc /* Primary operator. Uses the software for clinical decision support. */
    }

    part patient : Stakeholder {
        attribute redefines name = "Patient";
        doc /* Indirect beneficiary. Outcomes depend on correct software output. */
    }

    part regulatoryBody : Stakeholder {
        attribute redefines name = "Regulatory Body (FDA / Notified Body)";
        doc /* Oversight authority. Requires IEC 62304 software lifecycle evidence. */
    }

    // Goals / intended use
    action intendedUse : UseCase {
        attribute redefines name = "Intended Use";
        doc /* The software is intended to [describe clinical purpose] for use by [user] in [care setting]. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REQUIREMENTS LAYER
    // ═══════════════════════════════════════════════════════════════════════

    requirement unAccuracy : UserNeed {
        attribute redefines title = "Accurate Clinical Output";
        doc /* The software shall produce clinically accurate outputs within defined tolerance. */
    }

    requirement unUsability : UserNeed {
        attribute redefines title = "Usable Under Clinical Conditions";
        doc /* The software shall be usable by trained clinicians without dedicated IT support. */
    }

    requirement unDataIntegrity : UserNeed {
        attribute redefines title = "Patient Data Integrity";
        doc /* Patient data shall not be altered, lost, or exposed without authorization. */
    }

    requirement srAccuracy : SystemRequirement {
        attribute redefines title = "Output Accuracy Specification";
        doc /* The algorithm shall achieve sensitivity ≥ X% and specificity ≥ Y% on validated dataset. */
    }

    requirement srAuditLog : SystemRequirement {
        attribute redefines title = "Audit Trail";
        doc /* All clinician actions and system events shall be logged with timestamp and user ID. */
    }

    requirement srDataEncryption : SystemRequirement {
        attribute redefines title = "Data Encryption at Rest and In Transit";
        doc /* All patient data shall be encrypted using AES-256 at rest and TLS 1.3 in transit. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RISK LAYER — ISO 14971
    // ═══════════════════════════════════════════════════════════════════════

    requirement hazIncorrectOutput : Hazard {
        attribute redefines title = "Incorrect Clinical Output";
        doc /* Algorithm produces wrong result due to out-of-distribution input or model failure. */
    }

    requirement hazDataBreach : Hazard {
        attribute redefines title = "Unauthorized Patient Data Access";
        doc /* Patient data accessed or exfiltrated by unauthorized party. */
    }

    requirement hazSoftwareFailure : Hazard {
        attribute redefines title = "Software Crash During Clinical Use";
        doc /* Application failure during active clinical workflow. */
    }

    requirement hsIncorrectTreatment : HazardousSituation {
        attribute redefines title = "Incorrect Treatment Decision";
        doc /* Clinician acts on incorrect output leading to patient harm. */
    }

    requirement harmPatientInjury : Harm {
        attribute redefines title = "Patient Injury from Incorrect Treatment";
    }

    requirement rcAlgorithmValidation : RiskControl {
        attribute redefines title = "Algorithm Validation on Clinical Dataset";
        doc /* Validate algorithm against gold-standard clinical dataset per predefined acceptance criteria. */
    }

    requirement rcUseErrorMitigation : RiskControl {
        attribute redefines title = "Use Error Mitigation — Confidence Indicators";
        doc /* Display confidence score and flag low-confidence outputs for clinician review. */
    }

    // Risk chain connections
    connection : Mitigates connect control :>> rcAlgorithmValidation to hazard :>> hazIncorrectOutput;
    connection : Mitigates connect control :>> rcUseErrorMitigation to hazard :>> hazIncorrectOutput;
    connection : Causes connect hazard :>> hazIncorrectOutput to hs :>> hsIncorrectTreatment;

    // ═══════════════════════════════════════════════════════════════════════
    // FUNCTIONAL LAYER
    // ═══════════════════════════════════════════════════════════════════════

    action funcIngest : SystemFunction {
        attribute redefines name = "Ingest Clinical Data";
        doc /* Accept patient data from EHR, device, or manual entry. */
    }

    action funcAnalyze : SystemFunction {
        attribute redefines name = "Run Clinical Algorithm";
    }

    action funcPresent : SystemFunction {
        attribute redefines name = "Present Output to Clinician";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGICAL / SOFTWARE LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part samdSystem : System {
        attribute redefines name = "SaMD System";
    }

    part inferenceEngine : SoftwareComponent {
        attribute redefines name = "Clinical Inference Engine";
        doc /* Implements the clinical algorithm. IEC 62304 Software Class: TODO (A/B/C). */
    }

    part dataLayer : SoftwareComponent {
        attribute redefines name = "Patient Data Layer";
        doc /* Handles data persistence, encryption, and audit logging. */
    }

    part uiLayer : SoftwareComponent {
        attribute redefines name = "Clinical UI Layer";
        doc /* Presents results, handles clinician interactions, displays confidence indicators. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICATION LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part testAccuracyValidation : Test {
        attribute redefines name = "Algorithm Accuracy Validation";
        doc /* Verify accuracy metrics on holdout clinical dataset. Links to srAccuracy. */
    }

    part testAuditLog : Test {
        attribute redefines name = "Audit Trail Test";
        doc /* Verify all events are logged with correct timestamp and user ID. */
    }

    part testEncryption : Test {
        attribute redefines name = "Encryption Verification";
        doc /* Verify AES-256 at rest and TLS 1.3 in transit. */
    }
}
