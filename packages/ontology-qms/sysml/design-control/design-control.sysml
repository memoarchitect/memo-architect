package MEMO_Ontology_QMS_DesignControl {

    // ─── ISO 13485 §7.3 — Design and Development ─────────────────────────────
    // All design control artefacts derive from QMSRecord — they are controlled
    // documents that must be approved, versioned, and archived.

    part def DesignAndDevelopmentPlan :> QMSRecord {
        attribute scope : String;
        attribute designPhases : String;    // comma-separated phase names
    }

    // §7.3.3 — Design Inputs
    requirement def DesignInput :> RegulatoryRequirement {
        attribute inputType : String;       // Functional | Performance | Safety | Regulatory
        attribute sourceNeed : String;      // traceability back to user need
    }

    // §7.3.4 — Design Outputs
    part def DesignOutput :> QMSRecord {
        attribute outputType : String;      // Specification | Drawing | Procedure | Label
        attribute tracesTo : String;        // ID of corresponding DesignInput
    }

    // §7.3.5 — Design Review
    part def DesignReview :> QMSRecord {
        attribute reviewPhase : String;
        attribute reviewDate : String;
        attribute outcome : String;         // Pass | Conditional | Fail
    }

    // §7.3.6 — Design Verification
    part def DesignVerification :> ComplianceEvidence {
        attribute verificationMethod : String;  // Analysis | Inspection | Test | Demonstration
        attribute passFailCriteria : String;
    }

    // §7.3.7 — Design Validation
    part def DesignValidation :> ComplianceEvidence {
        attribute validationMethod : String;
        attribute targetUser : String;
    }

    // §7.3.8 — Design Transfer
    part def DesignTransfer :> QMSRecord {
        attribute productionSite : String;
    }

    // §7.3.9 — Design Changes
    part def DesignChange :> QMSRecord {
        attribute changeId : String;
        attribute safetyImpact : Boolean;
        attribute revalidationRequired : Boolean;
    }

    // Design History File index artefact (FDA 21 CFR Part 820.30(j))
    part def DHFArtifact :> QMSRecord {
        attribute dhfSection : String;
        attribute artifactType : String;
    }

    // ─── Design Control Relationships ─────────────────────────────────────────
    connection def TracesDesignInput {
        end output : DesignOutput [1];
        end input : DesignInput [1];
    }

    connection def VerifiesDesignOutput {
        end verification : DesignVerification [1];
        end output : DesignOutput [1];
    }

    connection def ValidatesDesignOutput {
        end validation : DesignValidation [1];
        end output : DesignOutput [1];
    }

    connection def DocumentsDesignChange {
        end change : DesignChange [1];
        end subject [1];
    }
}
