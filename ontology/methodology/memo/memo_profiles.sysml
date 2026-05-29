package memo::methodology::profiles {
    private import memo::methodology::core::*;
    private import memo::methodology::viewpoints::*;
    private import memo::methodology::rules::*;
    private import memo::methodology::patterns::*;
    private import memo::methodology::workflow::*;
    private import memo::methodology::gates::*;
    private import memo::core::enumerations::*;
    private import memo::base::methodology::*;

    part mdCoreLibrary : MethodologyLibrary {
        attribute id = "METHLIB-001";
        attribute name = "MedicalDeviceMethodologyLibrary";
        attribute version = "0.1";
        attribute domain = "medical device modeling";
        attribute description = "Methodology layer for selecting, restricting, sequencing, tailoring, and lightly extending use of the medical-device ontology.";
    }

    part mdLightDefaultDefinition : MethodologyDefinition {
        attribute id = "METH-001";
        attribute name = "MedicalDeviceLightDefault";
        attribute version = "0.1";
        attribute domain = "medical device modeling";
        attribute description = "Light default methodology around the ontology for smaller or early project use.";
        attribute baseMethodName = "";
    }

    part mdLightDefaultResolved : ResolvedMethodology {
        attribute id = "RMETH-001";
        attribute name = "MedicalDeviceLightDefaultResolved";
        attribute version = "0.1";
        attribute rigor = MethodRigorKind::lightweight;
        attribute resolutionSummary = "Light resolved methodology with core requirements, architecture, risk, verification, and RMF support.";
    }

    part riskView : Viewpoint {
        attribute id = "VP-001";
        attribute name = "RiskManagementView";
        attribute purpose = "Focus on risk chain, controls, verification, and residual risk.";
        attribute audience = AudienceKind::safetyEngineer;
        attribute stage = WorkflowStageKind::risk;
        attribute abstractionLevel = "safety management";
    }

    part swArchView : Viewpoint {
        attribute id = "VP-002";
        attribute name = "SoftwareArchitectureView";
        attribute purpose = "Focus on software decomposition, interfaces, timing, and contracts.";
        attribute audience = AudienceKind::softwareArchitect;
        attribute stage = WorkflowStageKind::architecture;
        attribute abstractionLevel = "software design";
    }

    part useRiskBeforeRule : ElementUsageRule {
        attribute id = "RULE-001";
        attribute name = "UseRiskBeforeAfter";
        attribute elementTypeName = "RiskBeforeMitigation,RiskAfterMitigation,RiskMatrix";
        attribute strength = RuleStrengthKind::recommended;
        attribute rationaleText = "Even a light methodology should distinguish pre- and post-mitigation risk and assess against a matrix.";
    }

    part requireVerificationLinkRule : RelationUsageRule {
        attribute id = "RULE-002";
        attribute name = "VerificationLinksRequired";
        attribute relationTypeName = "VerificationLink";
        attribute strength = RuleStrengthKind::required;
        attribute rationaleText = "Safety-relevant requirements and controls shall trace to verification.";
    }

    part lightRiskPattern : ModelingPattern {
        attribute id = "PAT-001";
        attribute name = "LightRiskBeforeAfterPattern";
        attribute intent = "Model hazard chain, before/after mitigation risk, controls, and residual evaluation in a lightweight way.";
        attribute stage = WorkflowStageKind::risk;
        attribute strength = RuleStrengthKind::recommended;
    }

    part lightTracePattern : ModelingPattern {
        attribute id = "PAT-002";
        attribute name = "CoreTracePattern";
        attribute intent = "Need or risk to requirement, requirement to architecture, requirement/control to verification.";
        attribute stage = WorkflowStageKind::requirements;
        attribute strength = RuleStrengthKind::required;
    }

    part stepRequirements : WorkflowStep {
        attribute id = "STEP-001";
        attribute name = "CaptureRequirements";
        attribute stepOrder = 1;
        attribute stage = WorkflowStageKind::requirements;
        attribute objective = "Capture stakeholder needs and derive requirements.";
        attribute entryCriteria = "Intended use and actors understood.";
        attribute exitCriteria = "Initial requirement set exists.";
    }

    part stepArchitecture : WorkflowStep {
        attribute id = "STEP-002";
        attribute name = "DefineArchitecture";
        attribute stepOrder = 2;
        attribute stage = WorkflowStageKind::architecture;
        attribute objective = "Define key software and hardware architecture elements and interfaces.";
        attribute entryCriteria = "Initial requirements exist.";
        attribute exitCriteria = "Core architecture and interfaces exist.";
    }

    part stepRisk : WorkflowStep {
        attribute id = "STEP-003";
        attribute name = "PerformRiskAnalysis";
        attribute stepOrder = 3;
        attribute stage = WorkflowStageKind::risk;
        attribute objective = "Create core risk chain and controls.";
        attribute entryCriteria = "Initial requirements and key behavior exist.";
        attribute exitCriteria = "Risk and control model exists.";
    }

    part stepVerification : WorkflowStep {
        attribute id = "STEP-004";
        attribute name = "PlanVerification";
        attribute stepOrder = 4;
        attribute stage = WorkflowStageKind::verification;
        attribute objective = "Define verification and evidence expectations.";
        attribute entryCriteria = "Requirements and controls exist.";
        attribute exitCriteria = "Verification cases and evidence targets exist.";
    }

    part gateLightComplete : QualityGate {
        attribute id = "GATE-001";
        attribute name = "LightMethodReady";
        attribute gateStage = WorkflowStageKind::verification;
        attribute passCriteria = "Core traceability, risk, verification, and RMF view support are present.";
    }

    part mdCoverageScope : MethodologyScope {
        attribute id = "SCOPE-COV-001";
        attribute name = "MedicalDeviceCoverageScope";
        attribute scopeName = "coverage";
        attribute includedArchLayer = "risk";
        attribute includedStandard = "ISO 14971";
        attribute includedArtifactKind = "";
        attribute includedViewpointType = "VP-CTX";
        attribute includedViewpointType = "VP-LOG";
        attribute includedViewpointType = "VP-RISK";
        attribute includedViewpointType = "VP-CYB";
        attribute excludedKind = "";
        attribute description = "Coverage rules across ISO 14971, IEC 62304, FDA 21 CFR 820, ISO 13485, ISO 14155, FDA Cybersecurity, IEC 62366, IEC 60601-1, IEC 82304-1.";
    }

    part gpcaProjectBinding : ProjectMethodBinding {
        attribute id = "PMB-001";
        attribute name = "GPCAProjectMethodBinding";
        attribute projectName = "GPCA";
    }

    part rmpDoc : DhfDocumentBinding {
        attribute id = "DHF-001";
        attribute name = "RiskManagementPlan";
        attribute documentTitle = "Risk Management Plan";
        attribute groupLabel = "Risk Management";
        attribute templateId = "iso-14971/rmp";
        attribute viewKind = "RMF";
        attribute regulatoryReference = "ISO 14971";
        attribute lifecycleStage = WorkflowStageKind::risk;
        attribute required = true;
    }

    part harDoc : DhfDocumentBinding {
        attribute id = "DHF-002";
        attribute name = "HazardAnalysisReport";
        attribute documentTitle = "Hazard Analysis Report";
        attribute groupLabel = "Risk Management";
        attribute templateId = "iso-14971/har";
        attribute viewKind = "RMF";
        attribute regulatoryReference = "ISO 14971";
        attribute lifecycleStage = WorkflowStageKind::risk;
        attribute required = true;
    }

    part sadDoc : DhfDocumentBinding {
        attribute id = "DHF-003";
        attribute name = "SoftwareArchitectureDescription";
        attribute documentTitle = "Software Architecture Description";
        attribute groupLabel = "Software";
        attribute templateId = "iec-62304/sad";
        attribute viewKind = "ArchitectureDescription";
        attribute regulatoryReference = "IEC 62304";
        attribute lifecycleStage = WorkflowStageKind::architecture;
        attribute required = true;
    }

    part threatModelDoc : DhfDocumentBinding {
        attribute id = "DHF-004";
        attribute name = "CybersecurityThreatModel";
        attribute documentTitle = "Threat Model";
        attribute groupLabel = "Cybersecurity";
        attribute templateId = "fda-cybersecurity/threat-model";
        attribute viewKind = "ThreatModel";
        attribute regulatoryReference = "FDA Cybersecurity Guidance";
        attribute lifecycleStage = WorkflowStageKind::risk;
        attribute required = true;
    }

    part vvPlanDoc : DhfDocumentBinding {
        attribute id = "DHF-005";
        attribute name = "VerificationValidationPlan";
        attribute documentTitle = "V&V Plan";
        attribute groupLabel = "Verification & Validation";
        attribute templateId = "21cfr820/vv-plan";
        attribute viewKind = "VV";
        attribute regulatoryReference = "21 CFR 820.30";
        attribute lifecycleStage = WorkflowStageKind::verification;
        attribute required = true;
    }
}
