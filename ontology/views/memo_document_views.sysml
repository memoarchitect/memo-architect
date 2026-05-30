package memo {
    package views {
        package document_views {
            private import memo::views::core::*;
            private import memo::core::enumerations::*;

            part def DocumentView specializes DocumentBackedView {
                attribute viewKind : DocumentViewKind;
            }

            part def CybersecurityThreatModelView specializes DocumentView {
                attribute viewKind = DocumentViewKind::ThreatModel;
                attribute generationRule = "Include assets, trust boundaries, threat scenarios, vulnerabilities, mitigations, and trace links to safety/privacy concerns.";
                attribute outputKind = {ViewOutputKind::documentSection};
                attribute presentationKind = {PresentationKind::narrativeSection};
            }

            part def CybersecurityAssessmentView specializes DocumentView {
                attribute viewKind = DocumentViewKind::CybersecurityAssessment;
                attribute generationRule = "Include cyber risks, exploitability, mitigations, security requirements, verification, residual risk, and postmarket evidence references.";
                attribute outputKind = {ViewOutputKind::documentSection};
                attribute presentationKind = {PresentationKind::riskTable};
            }
        }
    }
}
