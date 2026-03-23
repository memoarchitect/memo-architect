package MEMO_Ontology_Medical_Risk {

    enum def SeverityLevel {
        enum Negligible;
        enum Minor;
        enum Serious;
        enum Critical;
        enum Catastrophic;
    }

    enum def ProbabilityLevel {
        enum Incredible;
        enum Improbable;
        enum Remote;
        enum Occasional;
        enum Probable;
        enum Frequent;
    }

    requirement def Hazard {
        attribute hazardId : String;
        attribute title : String;
    }

    requirement def HazardousSituation {
        attribute hsId : String;
        attribute title : String;
    }

    requirement def Harm {
        attribute harmId : String;
        attribute title : String;
        attribute severity : SeverityLevel;
    }

    requirement def Risk {
        attribute riskId : String;
        attribute title : String;
        attribute severityPost : SeverityLevel;
        attribute probabilityPost : ProbabilityLevel;
    }

    requirement def RiskControl {
        attribute rcId : String;
        attribute title : String;
    }

    part def ClinicalBenefit {
        attribute benefitId : String;
        attribute title : String;
    }

    part def BenefitRiskAssessment {
        attribute assessmentId : String;
        attribute title : String;
        attribute conclusion : String;
    }

    part def ResidualRiskEvaluation {
        attribute evaluationId : String;
        attribute title : String;
        attribute acceptability : String;
    }

    part def OverallResidualRiskEvaluation {
        attribute evaluationId : String;
        attribute title : String;
        attribute acceptability : String;
        attribute conclusion : String;
    }

    part def RiskManagementPlan :> QMSRecord {
        attribute scope : String;
    }

    part def RiskManagementReport :> QMSRecord {
        attribute conclusion : String;
    }

    part def ProductionPostProductionSignal :> ComplianceEvidence {
        attribute signalId : String;
        attribute sourceType : String;
    }
}
