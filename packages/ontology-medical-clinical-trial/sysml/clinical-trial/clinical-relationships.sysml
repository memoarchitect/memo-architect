package MEMO_Ontology_MedicalProcess_Clinical_Relationships {

    connection def PlansClinicalEvaluation {
        end plan : ClinicalEvaluationPlan [1];
        end subject [1];
    }

    connection def EvaluatesClinicalClaim {
        end report : ClinicalEvaluationReport [1];
        end claim : ClinicalClaim [1];
    }

    connection def SupportsClinicalClaim {
        end evidence : ClinicalEvidenceArtifact [1];
        end claim : ClinicalClaim [1];
    }

    connection def ClaimsClinicalBenefit {
        end claim : ClinicalClaim [1];
        end benefit : ClinicalBenefit [1];
    }

    connection def ClaimsForUse {
        end claim : ClinicalClaim [1];
        end subject [1];
    }
}
