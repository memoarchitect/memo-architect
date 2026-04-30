package memo::architecture::risk {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    private import memo::architecture::requirements::*;
    part def Risk :> RiskDriver { attribute probabilityEstimate : String; attribute severityEstimate : String; attribute riskLevel : String; attribute acceptability : String; }
    part def RiskBeforeMitigation :> Risk { attribute estimationBasis : String; attribute analysisContext : String; attribute foreseeableMisuseIncluded : Boolean; }
    part def RiskAfterMitigation :> Risk { attribute residualProbability : String; attribute residualSeverity : String; attribute residualAcceptability : String; attribute benefitRiskRequired : Boolean; }
    part def RiskMatrix :> TraceableElement { attribute probabilityScaleDefinition : String; attribute severityScaleDefinition : String; attribute riskLevelMapping : String; attribute acceptabilityThresholds : String; }
    part def Hazard :> TraceableElement { attribute hazardType : HazardTypeKind; attribute foreseeable : Boolean; }
    part def SequenceOfEvents :> TraceableElement { attribute initiatingEvent : String; attribute contributingFactors : String; }
    part def HazardousSituation :> TraceableElement { attribute exposedPersons : String; attribute operatingCondition : String; }
    part def Harm :> TraceableElement { attribute clinicalImpact : String; attribute reversibility : String; attribute criticality : CriticalityKind; }
    part def RiskControl :> VerifiableElement { attribute controlKind : RiskControlKind; attribute implementationKind : String; attribute verificationStatus : String; }
    part def OverallResidualRiskEvaluation :> TraceableElement { attribute conclusion : String; attribute reviewer : String; }
}
