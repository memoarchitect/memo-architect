package MEMO_Ontology_Process_IEC60601 {

    // IEC 60601-1:2005+A1+A2 — General requirements for basic safety and
    // essential performance. Process activities and work products only.

    part def EssentialPerformanceDefinition :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute epId : String;
        attribute statement : String;
        attribute clinicalConsequenceOfLoss : String;
    }

    part def BasicSafetyRequirement :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute requirementRef : String;
        attribute clause : String;
        attribute collateralStandard : String;
    }

    part def EssentialPerformanceVerification :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute testRef : String;
        attribute passFailCriteria : String;
        attribute result : String;
    }

    part def RiskAssessmentForEP :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute epRef : String;
        attribute failureConsequence : String;
        attribute mitigationAdequate : Boolean;
    }

    connection def VerifiesEssentialPerformance {
        end verification : EssentialPerformanceVerification [1];
        end ep : EssentialPerformanceDefinition [1];
    }

    connection def AssessesEPRisk {
        end assessment : RiskAssessmentForEP [1];
        end ep : EssentialPerformanceDefinition [1];
    }
}
