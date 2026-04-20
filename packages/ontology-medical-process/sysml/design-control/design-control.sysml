package MEMO_Ontology_MedicalProcess_DesignControl {

    // ─── IEC 62366-1 — Usability Engineering ─────────────────────────────────
    // Intended use and user interface requirements specific to medical devices.
    // DesignInput, DesignOutput, DesignReview now live in ontology-qms;
    // these are medical-domain specialisations or additions.

    // The clinical intended purpose — the foundation of the DHF.
    requirement def IntendedUse :> RegulatoryRequirement {
        attribute intendedPatientPopulation : String;
        attribute intendedOperatingEnvironment : String;
        attribute contraindicatedUses : String;
    }

    // IEC 62366-1 §5.4 — known and foreseeable use errors to analyse.
    requirement def UseError :> Requirement {
        attribute useErrorId : String;
        attribute title : String;
        attribute severity : String;
    }

    // The use specification (§5.3) — the reference for summative evaluation.
    part def UseSpecification :> QMSRecord {
        attribute targetUserGroup : String;
        attribute useEnvironment : String;
    }

    // Use error analysis artefact (§5.5).
    part def UseErrorAnalysis :> QMSRecord {
        attribute analysisMethod : String;  // UFMEA, walkthrough, etc.
    }

    // Usability specification (§5.6) — acceptance criteria for evaluations.
    part def UsabilitySpecification :> QMSRecord {
        attribute evaluationCriteria : String;
    }

    // Formative (early-phase) usability evaluation (§5.7).
    part def FormativeEvaluation :> DesignValidation {
        attribute evaluationPhase : String;
        attribute participantCount : Integer;
    }

    // Summative (final) usability evaluation (§5.8) — the primary evidence.
    part def SummativeEvaluation :> DesignValidation {
        attribute finalEvaluation : Boolean;
        attribute participantCount : Integer;
    }

    // ─── Relationships ────────────────────────────────────────────────────────
    connection def AddressesUseError {
        end uiRequirement : Requirement [1];
        end useError : UseError [1];
    }

    connection def AnalyzesUseError {
        end analysis : UseErrorAnalysis [1];
        end useError : UseError [1];
    }

    connection def ExposesUseError {
        end scenario : OperationalScenario [1];
        end useError : UseError [1];
    }

    connection def SpecifiesScenario {
        end specification : UseSpecification [1];
        end scenario : OperationalScenario [1];
    }

    connection def EvaluatesRequirement {
        end evaluation : ValidationCase [1];
        end uiRequirement : Requirement [1];
    }

    connection def ContributesToHazard {
        end useError : UseError [1];
        end hazard : Hazard [1];
    }
}
