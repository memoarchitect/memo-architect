package memo {
    package examples {
        package gpca {
            package document_views {
                private import memo::views::document_views::*;

                part rmfView : DocumentView {
                    attribute id = "DOC-001";
                    attribute name = "RiskManagementFileView";
                    attribute title = "GPCA Risk Management File View";
                    attribute shortDescription = "Document-backed risk view for GPCA.";
                    attribute longDescription = "Aggregates the risk chain, controls, verification, residual risk, and cybersecurity links needed for the GPCA risk management file.";
                    attribute version = "0.2";
                    attribute lifecycleState = LifecycleStateKind::development;
                    attribute viewKind = DocumentViewKind::RMF;
                    attribute generationRule = "Include risk chain, controls, verification, residual risk, and cybersecurity traceability";
                    attribute marketScope = "generic";
                    attribute documentUsage = {"RMF", "QMSR"};
                    attribute sectionIdentifier = "RMF";
                }

                part threatModelView : CybersecurityThreatModelView {
                    attribute id = "DOC-002";
                    attribute name = "GPCACyberThreatModelView";
                    attribute title = "GPCA Cybersecurity Threat Model View";
                    attribute shortDescription = "Threat-model-oriented document view for GPCA.";
                    attribute longDescription = "Captures GPCA cyber assets, trust boundaries, threats, threat scenarios, vulnerabilities, and mitigations for secure product development records.";
                    attribute version = "0.1";
                    attribute lifecycleState = LifecycleStateKind::development;
                    attribute marketScope = "generic";
                    attribute documentUsage = {"Threat Model", "QMSR"};
                    attribute sectionIdentifier = "CYB-TM";
                }

                part cyberAssessmentView : CybersecurityAssessmentView {
                    attribute id = "DOC-003";
                    attribute name = "GPCACybersecurityAssessmentView";
                    attribute title = "GPCA Cybersecurity Assessment View";
                    attribute shortDescription = "Cybersecurity risk-assessment-oriented document view for GPCA.";
                    attribute longDescription = "Captures GPCA cyber risks, mitigations, security requirements, verification, and safety/privacy traceability for cybersecurity assessment records.";
                    attribute version = "0.1";
                    attribute lifecycleState = LifecycleStateKind::development;
                    attribute marketScope = "generic";
                    attribute documentUsage = {"Cybersecurity Risk Assessment", "RMF", "QMSR"};
                    attribute sectionIdentifier = "CYB-RA";
                }
            }
        }
    }
}
