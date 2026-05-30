package memo {
    package examples {
        package gpca {
            package views {
                private import memo::views::core::*;
                private import memo::views::document_views::*;
                private import memo::viewpoints::default_viewpoints::*;

                part gpcaLogicalArchitectureView : DiagramView {
                    attribute id = "VIEW-LOG-001";
                    attribute name = "GPCA_LogicalArchitectureView";
                    attribute title = "GPCA Logical Architecture View";
                    attribute shortDescription = "Logical decomposition of the GPCA system.";
                    attribute longDescription = "Product-specific logical architecture view that references the default logical architecture viewpoint and is intended for design description and architecture communication.";
                    attribute outputKind = {ViewOutputKind::diagram};
                    attribute presentationKind = {PresentationKind::blockDiagram};
                    attribute diagramType = "bdd";
                    attribute dataSourceDescription = "GPCA architecture and interface model elements";
                    attribute autoPopulate = true;
                    attribute queryDescription = "Include GPCA logical components and key interfaces relevant to therapy control.";
                    attribute documentUsage = {"SDD", "Architecture Description", "QMSR"};
                    part selectionQuery {
                        attribute id = "QRY-LOG-001";
                        attribute name = "GPCA_LogicalArchitectureQuery";
                        attribute includeElementKinds = {"LogicalComponent", "LogicalInterface", "Function"};
                        attribute includeLayers = {"functions", "logical_structure", "logical_interfaces"};
                        attribute selectionExpression = "product == 'GPCA' and concern contains therapy control";
                        attribute rationaleText = "Auto-populate the GPCA logical architecture view from the core product model.";
                    }
                    part viewpoint :> logicalArchitectureViewpoint;
                }

                part gpcaCybersecurityView : DiagramView {
                    attribute id = "VIEW-CYB-001";
                    attribute name = "GPCA_CybersecurityView";
                    attribute title = "GPCA Cybersecurity View";
                    attribute shortDescription = "Shows GPCA assets, trust boundaries, threats, vulnerabilities, and mitigations.";
                    attribute longDescription = "Product-specific cybersecurity view intended for secure product development and cross-reference into cybersecurity risk documentation.";
                    attribute outputKind = {ViewOutputKind::diagram};
                    attribute presentationKind = {PresentationKind::custom};
                    attribute diagramType = "threat-model";
                    attribute dataSourceDescription = "GPCA cyber assets, threat scenarios, and trace links";
                    attribute autoPopulate = true;
                    attribute queryDescription = "Include cyber assets, trust boundaries, threats, vulnerabilities, cyber hazards, cyber risks, mitigations, security requirements, and verification.";
                    attribute documentUsage = {"Threat Model", "Cybersecurity Risk Assessment", "QMSR"};
                    part selectionQuery {
                        attribute id = "QRY-CYB-001";
                        attribute name = "GPCA_CybersecurityQuery";
                        attribute includeElementKinds = {"CybersecurityAsset", "Threat", "Vulnerability", "CyberHazard", "CyberRisk", "CyberMitigation", "SecurityRequirement", "TrustBoundary", "ThreatScenario"};
                        attribute includeLayers = {"cybersecurity", "risk", "assurance"};
                        attribute includeConcerns = {ConcernKind::cybersecurity, ConcernKind::privacy, ConcernKind::safety};
                        attribute selectionExpression = "product == 'GPCA'";
                        attribute rationaleText = "Auto-populate the GPCA cybersecurity view from the cyber layer and cross-layer trace model.";
                    }
                    part viewpoint :> cybersecurityViewpoint;
                }

                part gpcaThreatModelView : CybersecurityThreatModelView {
                    attribute id = "DOC-CYB-001";
                    attribute name = "GPCA_ThreatModelView";
                    attribute title = "GPCA Threat Model View";
                    attribute shortDescription = "Document-backed view for GPCA threat modeling.";
                    attribute longDescription = "Collects assets, trust boundaries, threats, scenarios, vulnerabilities, and mitigations for the GPCA threat model.";
                    attribute version = "0.1";
                    attribute lifecycleState = LifecycleStateKind::development;
                    attribute marketScope = "generic";
                    attribute dataSourceDescription = "GPCA cybersecurity layer and cross-layer trace links";
                    attribute autoPopulate = true;
                    attribute queryDescription = "Include all GPCA cyber assets, trust boundaries, threat scenarios, linked vulnerabilities, and mapped mitigations.";
                    attribute documentUsage = {"Threat Model", "QMSR"};
                    attribute sectionIdentifier = "CYB-TM";
                    part selectionQuery {
                        attribute id = "QRY-CYB-002";
                        attribute name = "GPCA_ThreatModelQuery";
                        attribute includeElementKinds = {"CybersecurityAsset", "Threat", "Vulnerability", "ThreatScenario", "CyberMitigation", "TrustBoundary"};
                        attribute includeLayers = {"cybersecurity"};
                        attribute includeConcerns = {ConcernKind::cybersecurity, ConcernKind::privacy};
                        attribute selectionExpression = "product == 'GPCA'";
                        attribute rationaleText = "Populate the GPCA threat model section from cyber assets, boundaries, and threat scenarios.";
                    }
                    part viewpoint :> cybersecurityViewpoint;
                }

                part gpcaCybersecurityAssessmentView : CybersecurityAssessmentView {
                    attribute id = "DOC-CYB-002";
                    attribute name = "GPCA_CybersecurityAssessmentView";
                    attribute title = "GPCA Cybersecurity Assessment View";
                    attribute shortDescription = "Document-backed view for GPCA cybersecurity risk assessment.";
                    attribute longDescription = "Collects cyber risks, safety/privacy impacts, mitigations, security requirements, verification, and residual assessment for GPCA.";
                    attribute version = "0.1";
                    attribute lifecycleState = LifecycleStateKind::development;
                    attribute marketScope = "generic";
                    attribute dataSourceDescription = "GPCA cybersecurity and safety risk model elements with assurance evidence";
                    attribute autoPopulate = true;
                    attribute queryDescription = "Include GPCA cyber risks, safety links, mitigations, derived security requirements, and verification evidence.";
                    attribute documentUsage = {"Cybersecurity Risk Assessment", "RMF", "QMSR"};
                    attribute sectionIdentifier = "CYB-RA";
                    part selectionQuery {
                        attribute id = "QRY-CYB-003";
                        attribute name = "GPCA_CyberAssessmentQuery";
                        attribute includeElementKinds = {"CyberRisk", "CyberHazard", "CyberMitigation", "SecurityRequirement", "VerificationCase", "Evidence"};
                        attribute includeLayers = {"cybersecurity", "risk", "assurance"};
                        attribute includeConcerns = {ConcernKind::cybersecurity, ConcernKind::safety};
                        attribute selectionExpression = "product == 'GPCA'";
                        attribute rationaleText = "Populate the GPCA cybersecurity assessment from risks, mitigations, derived requirements, and evidence.";
                    }
                    part viewpoint :> cybersecurityViewpoint;
                }
            }
        }
    }
}
