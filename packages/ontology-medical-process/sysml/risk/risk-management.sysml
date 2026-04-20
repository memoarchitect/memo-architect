package MEMO_Ontology_MedicalProcess_Risk {

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

    enum def RiskAcceptability {
        enum Acceptable;
        enum ALARP;
        enum Unacceptable;
    }

    requirement def Risk {
        attribute riskId : String;
        attribute title : String;
        attribute initialSeverity : SeverityLevel;
        attribute initialProbability : ProbabilityLevel;
        attribute residualSeverity : SeverityLevel;
        attribute residualProbability : ProbabilityLevel;
        attribute acceptability : RiskAcceptability;
    }

    requirement def RiskControl {
        attribute rcId : String;
        attribute title : String;
    }

    part def SequenceOfEvents {
        attribute seqId : String;
        attribute title : String;
    }

    part def InitialRiskAssessment {
        attribute severity : SeverityLevel;
        attribute probability : ProbabilityLevel;
        attribute acceptability : RiskAcceptability;
    }

    part def ResidualRiskAssessment {
        attribute severity : SeverityLevel;
        attribute probability : ProbabilityLevel;
        attribute acceptability : RiskAcceptability;
    }

    part def RiskMatrix {
        attribute name : String;
        attribute severityLevels : Integer;
        attribute probabilityLevels : Integer;
    }

    part def RiskMatrixCell {
        attribute severity : SeverityLevel;
        attribute probability : ProbabilityLevel;
        attribute acceptability : RiskAcceptability;
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
