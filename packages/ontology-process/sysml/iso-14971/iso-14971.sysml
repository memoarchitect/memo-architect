package MEMO_Ontology_Process_ISO14971 {

    // ISO 14971:2019 — Risk Management for Medical Devices.
    // Process layer: activities and work products.
    // Risk *classes* (Hazard, Risk, Mitigation) live in ontology-arch/safety/.

    part def RiskManagementPlan :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute scope : String;
        attribute riskPolicy : String;
        attribute reviewFrequency : String;
    }

    part def RiskManagementReport :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute conclusion : String;
        attribute overallResidualRiskAcceptable : Boolean;
        attribute benefitRiskConclusion : String;
    }

    part def HazardAnalysisActivity :> MEMO_Ontology_Process_Common::ProcessActivity {
        attribute method : String;
        attribute scope : String;
    }

    part def ResidualRiskEvaluation :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute evaluationId : String;
        attribute acceptability : String;
        attribute evidenceRef : String;
    }

    part def OverallResidualRiskEvaluation :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute evaluationId : String;
        attribute conclusion : String;
        attribute benefitRiskRatio : String;
    }

    part def BenefitRiskAssessment :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute assessmentId : String;
        attribute clinicalBenefit : String;
        attribute residualRiskLevel : String;
        attribute conclusion : String;
    }

    part def PostMarketSurveillanceFeedback :> MEMO_Ontology_Process_Common::WorkProduct {
        attribute signalId : String;
        attribute sourceType : String;
        attribute reviewPeriod : String;
        attribute actionTaken : String;
    }

    connection def PlansRiskManagement {
        end plan : RiskManagementPlan [1];
        end subject[1];
    }

    connection def ConcludesOverallResidualRisk {
        end report : RiskManagementReport [1];
        end evaluation : OverallResidualRiskEvaluation [1];
    }

    connection def MonitorsPostMarket {
        end signal : PostMarketSurveillanceFeedback [1];
        end subject[1];
    }
}
