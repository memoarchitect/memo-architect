package MEMO_Ontology_Process_EUMDR {

    // EU MDR 2017/745 — Medical Device Regulation.
    // Technical documentation, PMCF, and UDI requirements.

    part def TechnicalDocumentation :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute tdId : String;
        attribute annexReference : String;
        attribute deviceDescription : String;
        attribute classificationRule : String;
        attribute notifiedBodyRef : String;
    }

    part def PMCFPlan :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute planId : String;
        attribute methods : String;
        attribute timelines : String;
        attribute rationale : String;
    }

    part def PMCFEvaluationReport :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute reportId : String;
        attribute conclusionsOnSafety : String;
        attribute conclusionsOnPerformance : String;
        attribute nextReviewDate : String;
    }

    part def PeriodicSafetyUpdateReport :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute psurId : String;
        attribute reportingPeriod : String;
        attribute benefitRiskConclusion : String;
        attribute salesVolume : Integer;
    }

    part def SummaryOfSafetyAndClinicalPerformance :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute sscpId : String;
        attribute publicVersion : String;
        attribute notifiedBodyValidated : Boolean;
    }

    connection def SupportsTechnicalDoc {
        end workProduct : MEMO_Ontology_Process_Common::WorkProduct [1];
        end td : TechnicalDocumentation [1];
    }

    connection def FulfillsPMCF {
        end report : PMCFEvaluationReport [1];
        end plan : PMCFPlan [1];
    }
}
