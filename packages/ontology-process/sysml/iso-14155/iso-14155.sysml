package MEMO_Ontology_Process_ISO14155 {

    // ISO 14155:2020 — Clinical investigation of medical devices for human subjects.

    part def ClinicalInvestigationPlan :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute cipId : String;
        attribute investigationObjective : String;
        attribute endpointsPrimary : String;
        attribute endpointsSecondary : String;
        attribute sampleSize : Integer;
        attribute duration : String;
    }

    part def InvestigatorBrochure :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute ibVersion : String;
        attribute deviceDescription : String;
        attribute preClinicalData : String;
        attribute clinicalData : String;
    }

    part def ClinicalInvestigationReport :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute reportId : String;
        attribute primaryEndpointMet : Boolean;
        attribute adverseEvents : String;
        attribute conclusion : String;
    }

    part def ClinicalPerformanceClaim :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute claimId : String;
        attribute statement : String;
        attribute evidenceRef : String;
    }

    part def ClinicalSafetyClaim :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute claimId : String;
        attribute statement : String;
        attribute adverseEventProfile : String;
    }

    part def ClinicalEvaluationPlan :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute cepId : String;
        attribute evaluationMethod : String;
        attribute equivalenceDevice : String;
    }

    part def ClinicalEvaluationReport :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute cerId : String;
        attribute conclusion : String;
        attribute nextReviewDate : String;
    }

    connection def PlansClinicalEvaluation {
        end plan : ClinicalEvaluationPlan [1];
        end subject[1];
    }

    connection def EvaluatesClinicalClaim {
        end report : ClinicalEvaluationReport [1];
        end claim : ClinicalPerformanceClaim [1];
    }

    connection def SupportsClinicalClaim {
        end investigation : ClinicalInvestigationReport [1];
        end claim : ClinicalPerformanceClaim [1];
    }
}
