package MEMO_Ontology_Arch_Safety {

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

    enum def RiskAcceptability {
        enum Acceptable;
        enum ALARP;
        enum Unacceptable;
    }

    part def Hazard {
        attribute hazardId : String;
        attribute title : String;
        attribute category : String;
    }

    part def HazardousSituation {
        attribute hsId : String;
        attribute title : String;
        attribute foreseeable : Boolean;
    }

    part def Harm {
        attribute harmId : String;
        attribute title : String;
        attribute severity : SeverityLevel;
    }

    part def Risk {
        attribute riskId : String;
        attribute title : String;
        attribute initialSeverity : SeverityLevel;
        attribute initialProbability : ProbabilityLevel;
        attribute residualSeverity : SeverityLevel;
        attribute residualProbability : ProbabilityLevel;
        attribute acceptability : RiskAcceptability;
        attribute initialRPN : Integer;
        attribute residualRPN : Integer;
    }

    part def Mitigation {
        attribute mitigationId : String;
        attribute title : String;
        attribute mitigationType : String;
        attribute implementationStatus : String;
    }

    part def FailureMode {
        attribute fmId : String;
        attribute title : String;
        attribute detectionMethod : String;
        attribute detectability : Integer;
        attribute occurrence : Integer;
        attribute severity : SeverityLevel;
    }

    part def FaultTreeNode {
        attribute nodeId : String;
        attribute nodeType : String;
        attribute description : String;
    }
}
