package memo {
    package architecture {
        package risk {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;
            private import memo::architecture::requirements::*;
            part def Risk specializes RiskDriver { attribute probabilityEstimate : String; attribute severityEstimate : String; attribute riskLevel : String; attribute acceptability : String; }
            part def RiskBeforeMitigation specializes Risk { attribute estimationBasis : String; attribute analysisContext : String; attribute foreseeableMisuseIncluded : Boolean; }
            part def RiskAfterMitigation specializes Risk { attribute residualProbability : String; attribute residualSeverity : String; attribute residualAcceptability : String; attribute benefitRiskRequired : Boolean; }
            part def RiskMatrix specializes TraceableElement { attribute probabilityScaleDefinition : String; attribute severityScaleDefinition : String; attribute riskLevelMapping : String; attribute acceptabilityThresholds : String; }
            item def Hazard specializes TraceableElement { attribute hazardType : HazardTypeKind; attribute foreseeable : Boolean; }
            item def SequenceOfEvents specializes TraceableElement { attribute initiatingEvent : String; attribute contributingFactors : String; }
            item def HazardousSituation specializes TraceableElement { attribute exposedPersons : String; attribute operatingCondition : String; }
            item def Harm specializes TraceableElement { attribute clinicalImpact : String; attribute reversibility : String; attribute criticality : CriticalityKind; }
            item def RiskControl specializes VerifiableElement { attribute controlKind : RiskControlKind; attribute implementationKind : String; attribute verificationStatus : String; }
            item def OverallResidualRiskEvaluation specializes TraceableElement { attribute conclusion : String; attribute reviewer : String; }
        }
    }
}
