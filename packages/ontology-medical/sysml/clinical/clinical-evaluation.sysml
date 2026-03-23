package MEMO_Ontology_Medical_ClinicalEvaluation {

    requirement def ClinicalClaim :> Requirement {
        attribute claimId : String;
        attribute title : String;
        attribute claimBasis : String;
    }

    requirement def ClinicalPerformanceClaim :> ClinicalClaim { }

    requirement def ClinicalSafetyClaim :> ClinicalClaim { }

    part def ClinicalEvidenceArtifact :> ComplianceEvidence {
        attribute sourceKind : String;
        attribute citation : String;
    }

    part def ClinicalInvestigationReference :> ClinicalEvidenceArtifact { }

    part def ClinicalLiteratureReference :> ClinicalEvidenceArtifact { }

    part def ClinicalExperienceEvidence :> ClinicalEvidenceArtifact { }

    part def ClinicalEvaluationPlan :> QMSRecord {
        attribute objective : String;
    }

    part def ClinicalEvaluationReport :> QMSRecord {
        attribute conclusion : String;
    }
}
