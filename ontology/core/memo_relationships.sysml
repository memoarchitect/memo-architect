package memo {
    package core {
        package relationships {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;

            part def SemanticLink specializes TraceableElement { attribute linkStatus : LinkStatusKind; }
            part def RequirementSourceLink specializes SemanticLink { attribute sourceRole : String; part sourceDriver : RequirementDriver; part targetRequirement : VerifiableElement; }
            part def RequirementSatisfactionLink specializes SemanticLink { part requirement : VerifiableElement; part satisfyingElement : ArchitectureElement; }
            part def HazardMitigationLink specializes SemanticLink { part riskControl : VerifiableElement; part mitigatedHazard : TraceableElement; }
            part def FunctionAllocationLink specializes SemanticLink { part function : ArchitectureElement; part allocatedElement : ArchitectureElement; }
            part def InterfaceRealizationLink specializes SemanticLink { part logicalInterface : InterfaceElement; part physicalInterface : InterfaceElement; }
            part def VerificationLink specializes SemanticLink { part verificationTarget : VerifiableElement; part verificationCase : VerifiableElement; }
            part def EvidenceProductionLink specializes SemanticLink { part producer : VerifiableElement; part producedEvidence : EvidenceElement; }
            part def DocumentInclusionLink specializes SemanticLink { part sourceElement : TraceableElement; part targetView : TraceableElement; }
            part def RiskTraceLink specializes SemanticLink { attribute riskRole : String; part sourceRiskElement : TraceableElement; part targetRiskElement : TraceableElement; }
            part def ExecutionOrderLink specializes SemanticLink { attribute sameStepRequired : Boolean; attribute precedenceRationale : String; part predecessor : ArchitectureElement; part successor : ArchitectureElement; }
            part def MethodologyBindingLink specializes SemanticLink { part boundModelElement : TraceableElement; part resolvedMethodology : TraceableElement; }

            part def AssetThreatLink specializes SemanticLink { attribute threatRole : String; part protectedAsset : ArchitectureElement; part realizedThreat : RequirementDriver; }
            part def ThreatVulnerabilityLink specializes SemanticLink { part realizedThreat : RequirementDriver; part enablingVulnerability : TraceableElement; }
            part def ThreatScenarioLink specializes SemanticLink { part realizedThreat : RequirementDriver; part scenario : TraceableElement; }
            part def VulnerabilityMitigationLink specializes SemanticLink { part enablingVulnerability : TraceableElement; part mitigation : VerifiableElement; }
            part def CyberRequirementDerivationLink specializes SemanticLink { part sourceThreatOrRisk : RequirementDriver; part targetRequirement : VerifiableElement; }
            part def CyberSafetyTraceLink specializes SemanticLink { attribute tracePurpose : String; part cyberElement : TraceableElement; part safetyElement : TraceableElement; }
            part def TrustBoundaryCrossingLink specializes SemanticLink { attribute crossingKind : InterfaceKind; part boundary : InterfaceElement; part crossingItem : TraceableElement; }
        }
    }
}
