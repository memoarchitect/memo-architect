package MEMO_Ontology_MedicalProcess_ClinicalEvaluation {

    requirement def ClinicalClaim :> Requirement {
        attribute claimId : String;
        attribute title : String;
        attribute claimBasis : String;
        attribute claimType : String;       // §4.5.8 — "Performance" | "Safety" | "Equivalence" | "BenefitRisk"
    }

    // §4.5.8 — performance claim adds measurable endpoint metadata.
    requirement def ClinicalPerformanceClaim :> ClinicalClaim {
        attribute endpointMetric : String;
        attribute performanceTarget : String;
    }

    // §4.5.8 — safety claim adds adverse-event metadata.
    requirement def ClinicalSafetyClaim :> ClinicalClaim {
        attribute adverseEventCategory : String;
        attribute acceptableRate : String;
    }

    part def ClinicalEvidenceArtifact :> ComplianceEvidence {
        attribute sourceKind : String;
        attribute citation : String;
        attribute evidenceSource : String;  // §4.5.9 — "investigation" | "literature" | "experience"
    }

    // §4.5.9 — experience-based evidence carries its own provenance metadata.
    part def ClinicalExperienceEvidence :> ClinicalEvidenceArtifact {
        attribute yearsOfExperience : Integer;
        attribute populationSize : Integer;
    }

    part def ClinicalEvaluationPlan :> QMSRecord {
        attribute objective : String;
    }

    part def ClinicalEvaluationReport :> QMSRecord {
        attribute conclusion : String;
    }
}
