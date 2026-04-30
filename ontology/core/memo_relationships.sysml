package memo::core::relationships {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;

    part def SemanticLink :> TraceableElement { attribute linkStatus : LinkStatusKind; }
    part def RequirementSourceLink :> SemanticLink { attribute sourceRole : String; part sourceDriver : RequirementDriver; part targetRequirement : VerifiableElement; }
    part def RequirementSatisfactionLink :> SemanticLink { part requirement : VerifiableElement; part satisfyingElement : ArchitectureElement; }
    part def FunctionAllocationLink :> SemanticLink { part function : ArchitectureElement; part allocatedElement : ArchitectureElement; }
    part def InterfaceRealizationLink :> SemanticLink { part logicalInterface : InterfaceElement; part physicalInterface : InterfaceElement; }
    part def VerificationLink :> SemanticLink { part verificationTarget : VerifiableElement; part verificationCase : VerifiableElement; }
    part def EvidenceProductionLink :> SemanticLink { part producer : VerifiableElement; part producedEvidence : EvidenceElement; }
    part def DocumentInclusionLink :> SemanticLink { part sourceElement : TraceableElement; part targetView : TraceableElement; }
    part def RiskTraceLink :> SemanticLink { attribute riskRole : String; part sourceRiskElement : TraceableElement; part targetRiskElement : TraceableElement; }
    part def ExecutionOrderLink :> SemanticLink { attribute sameStepRequired : Boolean; attribute precedenceRationale : String; part predecessor : ArchitectureElement; part successor : ArchitectureElement; }
    part def MethodologyBindingLink :> SemanticLink { part boundModelElement : TraceableElement; part resolvedMethodology : TraceableElement; }

    part def AssetThreatLink :> SemanticLink { attribute threatRole : String; part protectedAsset : ArchitectureElement; part realizedThreat : RequirementDriver; }
    part def ThreatVulnerabilityLink :> SemanticLink { part realizedThreat : RequirementDriver; part enablingVulnerability : TraceableElement; }
    part def ThreatScenarioLink :> SemanticLink { part realizedThreat : RequirementDriver; part scenario : TraceableElement; }
    part def VulnerabilityMitigationLink :> SemanticLink { part enablingVulnerability : TraceableElement; part mitigation : VerifiableElement; }
    part def CyberRequirementDerivationLink :> SemanticLink { part sourceThreatOrRisk : RequirementDriver; part targetRequirement : VerifiableElement; }
    part def CyberSafetyTraceLink :> SemanticLink { attribute tracePurpose : String; part cyberElement : TraceableElement; part safetyElement : TraceableElement; }
    part def TrustBoundaryCrossingLink :> SemanticLink { attribute crossingKind : InterfaceKind; part boundary : InterfaceElement; part crossingItem : TraceableElement; }
}
