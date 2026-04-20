package InfusionPump_Compliance {
    import MEMO_Ontology_MedicalProcess::*;
    import InfusionPump_Requirements::*;
    import InfusionPump_Risk::*;
    import InfusionPump_Architecture::*;

    requirement uiReqAlarmAcknowledgement : Requirement {
        attribute redefines category = RequirementCategory::Interface;
        attribute redefines domain = "UI";
        attribute redefines title = "Alarm acknowledgement shall require explicit user confirmation";
    }

    requirement useErrAlarmSilenced : UseError {
        attribute redefines title = "Clinician silences alarm without resolving occlusion";
    }

    action alarmAckScenario : OperationalScenario {
        attribute redefines name = "Alarm acknowledgement during occlusion";
    }

    part useSpecAlarmWorkflow : UseSpecification {
        attribute redefines title = "Alarm acknowledgement use specification";
    }

    part useErrorAnalysisAlarmWorkflow : UseErrorAnalysis {
        attribute redefines title = "Alarm acknowledgement use-error analysis";
    }

    requirement pofControlledInfusion : PrimaryOperatingFunction {
        attribute redefines title = "Deliver prescribed infusion within clinically acceptable limits";
    }

    requirement epControlledDelivery : EssentialPerformance {
        attribute redefines title = "Maintain controlled infusion delivery and annunciation";
    }

    requirement lossOfControlledDelivery : EssentialPerformanceLossCondition {
        attribute redefines title = "Loss of controlled infusion delivery or alarm annunciation during therapy";
    }

    action sfMaintainControlledDelivery : SafetyFunction {
        attribute redefines name = "Maintain controlled delivery under fault conditions";
    }

    part usabilitySpecAlarmWorkflow : UsabilitySpecification {
        attribute redefines title = "Alarm acknowledgement usability specification";
    }

    part formativeEvalAlarmWorkflow : FormativeEvaluation {
        attribute redefines title = "Alarm acknowledgement formative evaluation";
    }

    part summativeEvalAlarmWorkflow : SummativeEvaluation {
        attribute redefines title = "Alarm acknowledgement summative validation";
    }

    part swSystemPumpController : SoftwareSystem {
        attribute redefines name = "Infusion Pump Control System";
    }

    part swItemTherapyController : SoftwareItem {
        attribute redefines name = "Therapy Control Item";
        attribute redefines safetyClass = SoftwareSafetyClass::C;
    }

    part swItemAlarmSupervisor : SoftwareItem {
        attribute redefines name = "Alarm Supervisor Item";
        attribute redefines safetyClass = SoftwareSafetyClass::B;
    }

    part soupRtos : SOUPItem {
        attribute redefines name = "Embedded RTOS";
        attribute redefines supplier = "Third-party supplier";
    }

    part swPlanPumpController : SoftwareDevelopmentPlan {
        attribute redefines title = "Pump controller software development plan";
    }

    part swReqSpecPumpController : SoftwareWorkProduct {
        attribute redefines title = "Pump controller software requirements specification";
    }

    part swArchPumpController : SoftwareWorkProduct {
        attribute redefines title = "Pump controller software architecture";
    }

    part swDesignAlarmHandling : SoftwareWorkProduct {
        attribute redefines title = "Alarm handling detailed design";
    }

    part soupEvalRtos : SOUPEvaluation {
        attribute redefines title = "Embedded RTOS SOUP evaluation";
    }

    part anomalyAlarmDelay : SoftwareAnomaly {
        attribute redefines anomalyId = "ANOM-001";
        attribute redefines title = "Alarm acknowledgement latency regression";
    }

    part problemAlarmDelay : SoftwareProblemReport {
        attribute redefines reportId = "PR-001";
        attribute redefines title = "Alarm latency problem report";
    }

    part changeAlarmDelay : ChangeImpactAssessment {
        attribute redefines assessmentId = "CIA-001";
        attribute redefines title = "Alarm acknowledgement fix impact assessment";
    }

    part collateralAlarmStandard : CollateralStandardRequirement {
        attribute redefines name = "IEC 60601-1-8 alarm presentation applicability";
        attribute redefines standardRef = "IEC 60601-1-8";
        attribute redefines clause = "6.3";
    }

    part particularInfusionPumpStandard : ParticularStandardRequirement {
        attribute redefines name = "IEC 60601-2-24 infusion pump safety applicability";
        attribute redefines standardRef = "IEC 60601-2-24";
        attribute redefines clause = "201.12.4.101";
    }

    part dhfSoftwareTrace : DesignHistoryRecord {
        attribute redefines recordId = "DHF-001";
        attribute redefines title = "Software and usability trace package";
    }

    part evidenceFormativeUiFindings : ComplianceEvidence {
        attribute redefines recordId = "EV-002";
        attribute redefines title = "Formative usability findings";
        attribute redefines artifactType = "Formative Evaluation Report";
    }

    part evidenceUsabilitySummary : ComplianceEvidence {
        attribute redefines recordId = "EV-001";
        attribute redefines title = "Summative usability evidence";
        attribute redefines artifactType = "Usability Test Report";
    }

    part releaseBaseline10 : ReleaseBaseline {
        attribute redefines recordId = "REL-001";
        attribute redefines title = "Release baseline 1.0";
        attribute redefines version = "1.0.0";
    }

    action swDevProcessPumpController : SoftwareLifecycleProcess {
        attribute redefines name = "Pump controller software development process";
    }

    action swMaintProcessPumpController : SoftwareLifecycleProcess {
        attribute redefines name = "Pump controller software maintenance process";
    }

    action swRequirementsAlarmHandling : SoftwareLifecycleActivity {
        attribute redefines name = "Analyze alarm handling software requirements";
    }

    action swArchitectureAlarmHandling : SoftwareLifecycleActivity {
        attribute redefines name = "Design alarm handling software architecture";
    }

    action swVerificationAlarmHandling : SoftwareLifecycleActivity {
        attribute redefines name = "Verify alarm handling implementation";
    }

    action swProblemResolutionAlarmDelay : SoftwareLifecycleActivity {
        attribute redefines name = "Resolve alarm acknowledgement latency anomaly";
    }

    part testAlarmUiWorkflow : Test {
        attribute redefines testId = "TC-UI-001";
        attribute redefines name = "Alarm acknowledgement workflow test";
    }

    part testSoftwareFlowControl : Test {
        attribute redefines testId = "TC-SW-001";
        attribute redefines name = "Software flow control verification";
    }

    part testAntiFreeFlowContainment : Test {
        attribute redefines testId = "TC-MECH-001";
        attribute redefines name = "Anti-free-flow containment test";
    }

    connection : AddressesUseError connect uiRequirement ::> uiReqAlarmAcknowledgement to useError ::> useErrAlarmSilenced;
    connection : AnalyzesUseError connect analysis ::> useErrorAnalysisAlarmWorkflow to useError ::> useErrAlarmSilenced;
    connection : SpecifiesScenario connect specification ::> useSpecAlarmWorkflow to scenario ::> alarmAckScenario;
    connection : ExposesUseError connect scenario ::> alarmAckScenario to useError ::> useErrAlarmSilenced;
    connection : ContributesToHazard connect useError ::> useErrAlarmSilenced to hazard ::> hazUnderInfusion;
    connection : Refines connect refined ::> srAlarmAudibility to refiner ::> uiReqAlarmAcknowledgement;
    connection : SupportsOperatingFunction connect performance ::> epControlledDelivery to function ::> pofControlledInfusion;
    connection : DefinesLossCondition connect performance ::> epControlledDelivery to condition ::> lossOfControlledDelivery;
    connection : Preserves connect function ::> sfMaintainControlledDelivery to performance ::> epControlledDelivery;
    connection : ProtectsEssentialPerformance connect control ::> rcFlowRateLimiter to performance ::> epControlledDelivery;
    connection : ImplementsRiskControl connect implementer ::> sfMaintainControlledDelivery to control ::> rcFlowRateLimiter;
    connection : Satisfy connect satisfiedBy ::> swItemTherapyController to satisfies ::> srFlowAccuracy;
    connection : Satisfy connect satisfiedBy ::> swItemAlarmSupervisor to satisfies ::> srAlarmAudibility;
    connection : EvaluatesRequirement connect evaluation ::> formativeEvalAlarmWorkflow to uiRequirement ::> uiReqAlarmAcknowledgement;
    connection : EvaluatesRequirement connect evaluation ::> summativeEvalAlarmWorkflow to uiRequirement ::> uiReqAlarmAcknowledgement;
    connection : AppliesStandardRequirement connect standardRequirement ::> collateralAlarmStandard to subject ::> epControlledDelivery;
    connection : AppliesStandardRequirement connect standardRequirement ::> particularInfusionPumpStandard to subject ::> pofControlledInfusion;
    connection : Causes connect hazard ::> hazFreeFlow to situation ::> hsFreeFlowSituation;
    connection : LeadsTo connect situation ::> hsFreeFlowSituation to harm ::> harmOverdose;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> uiReqAlarmAcknowledgement;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> summativeEvalAlarmWorkflow;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> srAlarmAudibility;
    connection : Verify connect verifiedBy ::> testSoftwareFlowControl to verifies ::> srFlowAccuracy;
    connection : Verify connect verifiedBy ::> testSoftwareFlowControl to verifies ::> swrAlarmManagement;
    connection : Verify connect verifiedBy ::> testSoftwareFlowControl to verifies ::> rcFlowRateLimiter;
    connection : Verify connect verifiedBy ::> testAntiFreeFlowContainment to verifies ::> rcAntiFreeFlow;
    connection : GovernsActivity connect process ::> swDevProcessPumpController to activity ::> swRequirementsAlarmHandling;
    connection : GovernsActivity connect process ::> swDevProcessPumpController to activity ::> swArchitectureAlarmHandling;
    connection : GovernsActivity connect process ::> swDevProcessPumpController to activity ::> swVerificationAlarmHandling;
    connection : GovernsActivity connect process ::> swMaintProcessPumpController to activity ::> swProblemResolutionAlarmDelay;
    connection : ProducesWorkProduct connect activity ::> swRequirementsAlarmHandling to workProduct ::> swReqSpecPumpController;
    connection : ProducesWorkProduct connect activity ::> swArchitectureAlarmHandling to workProduct ::> swArchPumpController;
    connection : ProducesWorkProduct connect activity ::> swArchitectureAlarmHandling to workProduct ::> swDesignAlarmHandling;
    connection : ProducesWorkProduct connect activity ::> swProblemResolutionAlarmDelay to workProduct ::> problemAlarmDelay;
    connection : ProducesWorkProduct connect activity ::> swProblemResolutionAlarmDelay to workProduct ::> changeAlarmDelay;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> swPlanPumpController;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> swReqSpecPumpController;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> swArchPumpController;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> swDesignAlarmHandling;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> soupRtos;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> anomalyAlarmDelay;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> problemAlarmDelay;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> changeAlarmDelay;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> releaseBaseline10;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> useSpecAlarmWorkflow;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> useErrorAnalysisAlarmWorkflow;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> formativeEvalAlarmWorkflow;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> summativeEvalAlarmWorkflow;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> collateralAlarmStandard;
    connection : Documents connect record ::> dhfSoftwareTrace to subject ::> particularInfusionPumpStandard;
    connection : Evidences connect evidence ::> evidenceFormativeUiFindings to subject ::> formativeEvalAlarmWorkflow;
    connection : Evidences connect evidence ::> evidenceFormativeUiFindings to subject ::> useErrorAnalysisAlarmWorkflow;
    connection : Evidences connect evidence ::> evidenceUsabilitySummary to subject ::> summativeEvalAlarmWorkflow;
    connection : Evidences connect evidence ::> evidenceUsabilitySummary to subject ::> uiReqAlarmAcknowledgement;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swSystemPumpController;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swItemTherapyController;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swItemAlarmSupervisor;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> soupEvalRtos;
    connection : AllocateTo connect function ::> sfDisplayStatus to structure ::> alarmSubsystem;
}
