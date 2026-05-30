package memo {
    package viewpoints {
        package default_viewpoints {
            private import memo::viewpoints::core::*;
            private import memo::core::enumerations::*;

            part contextViewpoint : Viewpoint {
                attribute id = "VP-CTX";
                attribute name = "Context Viewpoint";
                attribute title = "System Context Viewpoint";
                attribute shortDescription = "Shows actors, use context, and system boundary.";
                attribute longDescription = "Default viewpoint derived from the context layer to communicate who interacts with the device, under which use conditions, and where trust or safety boundaries exist.";
                attribute purpose = "Communicate operational context and boundaries.";
                attribute audience = {AudienceKind::systemArchitect};
                attribute stage = WorkflowStageKind::context;
                attribute abstractionLevel = "system";
                attribute outputKind = {ViewOutputKind::diagram};
                attribute presentationKind = {PresentationKind::blockDiagram};
                attribute concern = {ConcernKind::safety, ConcernKind::interoperability};
                attribute includedLayers = {"context"};
                attribute allowedElementKinds = {"Actor", "UseContext", "TrustBoundary", "LogicalComponent"};
                attribute methodologyReference = {"default-layer-viewpoint"};
                attribute userExtensible = true;
            }

            part logicalArchitectureViewpoint : Viewpoint {
                attribute id = "VP-LOG";
                attribute name = "LogicalArchitectureViewpoint";
                attribute title = "Logical Architecture Viewpoint";
                attribute shortDescription = "Shows logical decomposition and interfaces.";
                attribute longDescription = "Default viewpoint derived from the logical architecture layer for subsystem structure, responsibilities, and major interactions.";
                attribute purpose = "Describe the system's logical decomposition.";
                attribute audience = {AudienceKind::systemArchitect};
                attribute stage = WorkflowStageKind::architecture;
                attribute abstractionLevel = "logical";
                attribute outputKind = {ViewOutputKind::diagram};
                attribute presentationKind = {PresentationKind::blockDiagram};
                attribute concern = {ConcernKind::safety, ConcernKind::performance};
                attribute includedLayers = {"functions", "logical_structure", "logical_interfaces"};
                attribute allowedElementKinds = {"LogicalComponent", "LogicalInterface", "Function"};
                attribute methodologyReference = {"default-layer-viewpoint"};
                attribute userExtensible = true;
            }

            part riskViewpoint : Viewpoint {
                attribute id = "VP-RISK";
                attribute name = "RiskViewpoint";
                attribute title = "Risk and Control Viewpoint";
                attribute shortDescription = "Shows hazards, risks, controls, and assurance links.";
                attribute longDescription = "Default viewpoint derived from the risk layer for ISO 14971-style reasoning across hazard, hazardous situation, harm, control, and verification evidence.";
                attribute purpose = "Communicate safety risk chains and controls.";
                attribute audience = {AudienceKind::safetyEngineer};
                attribute stage = WorkflowStageKind::risk;
                attribute abstractionLevel = "analysis";
                attribute outputKind = {ViewOutputKind::table};
                attribute presentationKind = {PresentationKind::riskTable};
                attribute concern = {ConcernKind::safety, ConcernKind::regulatory};
                attribute includedLayers = {"risk", "assurance"};
                attribute allowedElementKinds = {"Hazard", "HazardousSituation", "Harm", "Risk", "RiskControl", "VerificationCase"};
                attribute methodologyReference = {"iso14971-default"};
                attribute userExtensible = true;
            }

            part cybersecurityViewpoint : Viewpoint {
                attribute id = "VP-CYB";
                attribute name = "CybersecurityViewpoint";
                attribute title = "Cybersecurity Viewpoint";
                attribute shortDescription = "Shows assets, trust boundaries, threats, vulnerabilities, cyber hazards, cyber risks, and mitigations.";
                attribute longDescription = "Default viewpoint derived from the cybersecurity layer, using STRIDE-style threat categories by default while allowing safety and privacy impacts to be traced into the broader model.";
                attribute purpose = "Communicate cybersecurity design, threat analysis, and cyber risk posture.";
                attribute audience = {AudienceKind::securityEngineer};
                attribute stage = WorkflowStageKind::risk;
                attribute abstractionLevel = "analysis";
                attribute outputKind = {ViewOutputKind::diagram};
                attribute presentationKind = {PresentationKind::custom};
                attribute concern = {ConcernKind::cybersecurity, ConcernKind::privacy, ConcernKind::safety};
                attribute includedLayers = {"cybersecurity", "software_structure", "hardware_structure", "logical_interfaces", "risk", "assurance"};
                attribute allowedElementKinds = {"CybersecurityAsset", "Threat", "Vulnerability", "CyberHazard", "CyberRisk", "CyberMitigation", "SecurityRequirement", "TrustBoundary", "ThreatScenario"};
                attribute allowedRelationshipKinds = {"AssetThreatLink", "ThreatVulnerabilityLink", "ThreatScenarioLink", "VulnerabilityMitigationLink", "CyberRequirementDerivationLink", "CyberSafetyTraceLink", "TrustBoundaryCrossingLink"};
                attribute methodologyReference = {"stride-default", "fda-cybersecurity-default"};
                attribute documentUsage = {"Secure Product Development", "Threat Model", "Cybersecurity Risk Assessment", "QMSR"};
                attribute userExtensible = true;
            }
        }
    }
}
