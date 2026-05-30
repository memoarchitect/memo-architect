package memo {
    package methodology {
        package gpca {
            package scope {
                private import memo::methodology::core::*;
                private import memo::base::methodology::*;
                private import memo::core::enumerations::*;

                part gpcaCoverageScope : MethodologyScope {
                    attribute id = "SCOPE-GPCA-001";
                    attribute name = "GPCACoverageScope";
                    attribute scopeName = "coverage";

                    attribute includedArchLayer = "context";
                    attribute includedArchLayer = "requirements";
                    attribute includedArchLayer = "functions";
                    attribute includedArchLayer = "logical_structure";
                    attribute includedArchLayer = "logical_interfaces";
                    attribute includedArchLayer = "physical_interfaces";
                    attribute includedArchLayer = "software_structure";
                    attribute includedArchLayer = "hardware_structure";
                    attribute includedArchLayer = "behavior";
                    attribute includedArchLayer = "risk";
                    attribute includedArchLayer = "arch_risk";
                    attribute includedArchLayer = "assurance";
                    attribute includedArchLayer = "constraints";

                    attribute includedStandard = "ISO 14971";
                    attribute includedStandard = "IEC 62304";
                    attribute includedStandard = "21 CFR 820";
                    attribute includedStandard = "ISO 13485";
                    attribute includedStandard = "ISO 14155";
                    attribute includedStandard = "IEC 62366";
                    attribute includedStandard = "IEC 60601-1";

                    attribute includedArtifactKind = "RiskManagementPlan";

                    attribute includedViewpointType = "VP-CTX";
                    attribute includedViewpointType = "VP-LOG";
                    attribute includedViewpointType = "VP-RISK";

                    attribute excludedKind = "CybersecurityAsset";
                    attribute excludedKind = "AttackSurface";
                    attribute excludedKind = "Threat";
                    attribute excludedKind = "Vulnerability";
                    attribute excludedKind = "ThreatScenario";
                    attribute excludedKind = "CyberHazard";
                    attribute excludedKind = "CyberRisk";
                    attribute excludedKind = "CyberMitigation";
                    attribute excludedKind = "SecurityRequirement";
                    attribute excludedKind = "TrustBoundary";
                    attribute excludedKind = "SecurityClaim";
                    attribute excludedKind = "SOUPComponent";

                    attribute description = "GPCA prototype methodology — subtracts cybersecurity layer (non-networked device) and SOUPComponent (no SOUP in prototype). Derived from default methodology by exclusion.";
                }
            }
        }
    }
}
