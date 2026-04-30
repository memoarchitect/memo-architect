package memo::architecture::cybersecurity {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    private import memo::architecture::requirements::*;
    private import memo::architecture::risk::*;
    private import memo::architecture::assurance::*;

    part def CybersecurityAsset :> ArchitectureElement {
        attribute assetKind : AssetKind;
        attribute confidentialityNeed : String;
        attribute integrityNeed : String;
        attribute availabilityNeed : String;
        attribute privacyRelevant : Boolean;
        attribute safetyRelevant : Boolean;
        attribute owningLayer : String;
        attribute assetOwner : String;
        attribute classification : String;
    }

    part def AttackSurface :> TraceableElement {
        attribute entryPointKind : InterfaceKind;
        attribute exposureLevel : String;
        attribute reachableFrom : String;
        attribute authenticationExpected : Boolean;
    }

    part def Threat :> RiskDriver {
        attribute threatCategory : ThreatCategoryKind;
        attribute attackVector : String;
        attribute threatSource : String;
        attribute precondition : String;
        attribute affectedConcern : ConcernKind;
        attribute defaultTechnique : String;
        attribute strideCategory : ThreatCategoryKind;
    }

    part def Vulnerability :> TraceableElement {
        attribute weakness : String;
        attribute exploitability : String;
        attribute discoveryMethod : String;
        attribute affectedLayer : String;
        attribute cweReference : String;
        attribute remediable : Boolean;
    }

    part def ThreatScenario :> TraceableElement {
        attribute actorDescription : String;
        attribute assumptionSummary : String;
        attribute guaranteeSummary : String;
        attribute securityObjective : String;
        attribute abuseCaseReference : String;
        attribute defaultCategory : ThreatCategoryKind;
    }

    part def CyberHazard :> Hazard {
        attribute securityImpact : String;
        attribute safetyImpact : String;
        attribute privacyImpact : String;
        attribute operationalImpact : String;
        attribute linkedSafetyHazardId : String;
    }

    part def CyberRisk :> RiskBeforeMitigation {
        attribute exploitabilityEstimate : String;
        attribute attackComplexity : String;
        attribute detectability : String;
        attribute essentialPerformanceImpact : String;
        attribute patientSafetyContribution : String;
    }

    part def CyberMitigation :> RiskControl {
        attribute cyberControlKind : CyberControlKind;
        attribute securityMechanism : String;
        attribute verificationExpectation : String;
        attribute hardeningScope : String;
    }

    part def SecurityRequirement :> Requirement {
        attribute securityObjective : String;
        attribute derivedFromThreat : String;
        attribute derivedFromRisk : String;
        attribute defaultConcern : ConcernKind;
    }

    part def TrustBoundary :> InterfaceElement {
        attribute boundaryType : String;
        attribute crossingConstraint : String;
        attribute trustAssumption : String;
    }

    part def SecurityClaim :> EvidenceElement {
        attribute claimText : String;
        attribute claimScope : String;
        attribute supportedByEvidence : String;
    }
}
