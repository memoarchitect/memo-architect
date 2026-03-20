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

    part def BenefitRiskAssessment {
        attribute assessmentId : String;
        attribute conclusion : String;
    }
}
