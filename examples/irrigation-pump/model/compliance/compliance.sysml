package IrrigationPump_Compliance {
    import MEMO_Ontology_Medical::*;
    import IrrigationPump_Requirements::*;
    import IrrigationPump_Risk::*;
    import IrrigationPump_Behavior::*;
    import IrrigationPump_Architecture::*;

    part circulatingNurse : UserProfile {
        attribute redefines name = "Circulating Nurse";
        attribute redefines role = "Setup and consumable replacement";
    }

    part arthroscopySurgeon : UserProfile {
        attribute redefines name = "Arthroscopy Surgeon";
        attribute redefines role = "Primary operator and irrigation user";
    }

    part patientCase : Patient {
        attribute redefines name = "Arthroscopy Patient";
        attribute redefines category = "Surgical recipient";
        attribute redefines careContext = "Outpatient orthopedic procedure";
    }

    part operatingRoom : UseEnvironment {
        attribute redefines name = "Operating Room";
        attribute redefines setting = "Arthroscopy procedure suite";
    }

    part sterileField : ClinicalEnvironmentQualifier {
        attribute redefines name = "Sterile operating field";
        attribute redefines qualifierType = "Sterility";
    }

    part salineIrrigationFluid : Substance {
        attribute redefines name = "Sterile Saline Irrigation Fluid";
        attribute redefines category = "Procedure fluid";
        attribute redefines state = "Liquid";
    }

    part kneeJointSurgicalSite : AnatomicalSite {
        attribute redefines name = "Patient Knee Joint";
        attribute redefines category = "Surgical site";
        attribute redefines bodyRegion = "Knee joint";
        attribute redefines laterality = "Target limb";
    }

    part obsJointDistensionMaintained : ClinicalObservation {
        attribute redefines name = "Joint Space Distension Maintained";
        attribute redefines category = "Procedure outcome cue";
        attribute redefines measureType = "Visual observation";
        attribute redefines interpretation = "Adequate distension maintained for visualization";
    }

    part morphologyJointSpaceExpanded : MorphologyState {
        attribute redefines name = "Joint Space Expanded";
        attribute redefines category = "Morphology state";
        attribute redefines measureType = "Anatomical state";
        attribute redefines state = "Distended";
    }

    part methodPeristalticPressureControl : ProcedureMethod {
        attribute redefines name = "Closed-loop peristaltic pressure regulation";
        attribute redefines methodType = "Pressure-control method";
    }

    part routeArthroscopicCannulaDelivery : RouteOfAdministration {
        attribute redefines name = "Arthroscopic cannula irrigation route";
        attribute redefines routeType = "Minimally invasive fluid delivery";
    }

    action pathwayArthroscopyIrrigation : TreatmentPathway {
        attribute redefines name = "Arthroscopy irrigation support pathway";
        attribute redefines objective = "Establish and maintain irrigation support across setup, delivery, and alarm recovery";
    }

    action procPrimeCassette : ClinicalStep {
        attribute redefines name = "Prime Irrigation Cassette";
        attribute redefines objective = "Prepare a sterile, air-free irrigation path before use";
    }

    action procDeliverIrrigation : ClinicalStep {
        attribute redefines name = "Deliver Arthroscopy Irrigation";
        attribute redefines objective = "Maintain irrigation pressure and visualization during the procedure";
    }

    action procRespondToReservoirAlarm : ClinicalStep {
        attribute redefines name = "Respond To Reservoir Alarm";
        attribute redefines objective = "Restore irrigation before the field collapses";
    }

    requirement uiReqPrimeConfirmation : UserInterfaceRequirement {
        attribute redefines title = "Prime confirmation shall require completion acknowledgment before irrigation can start";
    }

    requirement useErrStartBeforePrime : UseError {
        attribute redefines title = "Clinician starts irrigation before confirming prime completion";
    }

    action primeWorkflowScenario : HazardRelatedUseScenario {
        attribute redefines name = "Disposable cassette priming before arthroscopy";
    }

    part useSpecPrimeWorkflow : UseSpecification {
        attribute redefines title = "Disposable cassette priming use specification";
    }

    part useErrorAnalysisPrimeWorkflow : UseErrorAnalysis {
        attribute redefines title = "Prime workflow use-error analysis";
    }

    requirement pofMaintainFieldDistension : PrimaryOperatingFunction {
        attribute redefines title = "Maintain surgical field distension with controlled irrigation pressure";
    }

    requirement epControlledIrrigationPressure : EssentialPerformance {
        attribute redefines title = "Maintain commanded irrigation pressure and alarming throughout the procedure";
    }

    requirement lossOfControlledIrrigation : EssentialPerformanceLossCondition {
        attribute redefines title = "Loss of controlled irrigation pressure or late depletion alarm during active irrigation";
    }

    action sfMaintainSafePressure : SafetyFunction {
        attribute redefines name = "Maintain safe irrigation pressure under cassette and sensor faults";
    }

    part usabilitySpecPrimeWorkflow : UsabilitySpecification {
        attribute redefines title = "Prime confirmation usability specification";
    }

    part formativeEvalPrimeWorkflow : FormativeEvaluation {
        attribute redefines title = "Prime confirmation formative evaluation";
    }

    part summativeEvalPrimeWorkflow : SummativeEvaluation {
        attribute redefines title = "Prime confirmation summative validation";
    }

    part swSystemIrrigationController : SoftwareSystem {
        attribute redefines name = "Surgical Irrigation Control System";
    }

    part swItemPressureController : SoftwareItem {
        attribute redefines name = "Pressure Controller Item";
        attribute redefines safetyClass = SoftwareSafetyClass::C;
    }

    part swItemAlarmSupervisor : SoftwareItem {
        attribute redefines name = "Alarm Supervisor Item";
        attribute redefines safetyClass = SoftwareSafetyClass::B;
    }

    part soupUiFramework : SOUPItem {
        attribute redefines name = "Embedded UI Framework";
        attribute redefines supplier = "Third-party supplier";
    }

    part swPlanIrrigationController : SoftwareDevelopmentPlan {
        attribute redefines title = "Irrigation controller software development plan";
    }

    part swReqSpecIrrigationController : SoftwareRequirementsArtifact {
        attribute redefines title = "Irrigation controller software requirements specification";
    }

    part swArchIrrigationController : SoftwareArchitectureArtifact {
        attribute redefines title = "Irrigation controller software architecture";
    }

    part swDesignPrimeWorkflow : SoftwareDetailedDesign {
        attribute redefines title = "Prime workflow and alarm handling detailed design";
    }

    part soupEvalUiFramework : SOUPEvaluation {
        attribute redefines title = "Embedded UI framework SOUP evaluation";
    }

    part anomalyPressureSpike : SoftwareAnomaly {
        attribute redefines anomalyId = "ANOM-IRR-001";
        attribute redefines title = "Transient pressure spike during cassette replacement";
    }

    part problemPressureSpike : SoftwareProblemReport {
        attribute redefines reportId = "PR-IRR-001";
        attribute redefines title = "Pressure spike problem report";
    }

    part changePressureSpike : ChangeImpactAssessment {
        attribute redefines assessmentId = "CIA-IRR-001";
        attribute redefines title = "Pressure spike correction impact assessment";
    }

    part collateralAlarmStandard : CollateralStandardRequirement {
        attribute redefines name = "IEC 60601-1-8 alarm audibility applicability";
        attribute redefines standardRef = "IEC 60601-1-8";
        attribute redefines clause = "6.3";
    }

    part particularIrrigationStandard : ParticularStandardRequirement {
        attribute redefines name = "Device-family irrigation pressure control applicability";
        attribute redefines standardRef = "Particular irrigation pump application";
        attribute redefines clause = "pressure control and alarming applicability";
    }

    part dhfIrrigationTrace : DesignHistoryRecord {
        attribute redefines recordId = "DHF-IRR-001";
        attribute redefines title = "Irrigation software and usability trace package";
    }

    part riskPlanIrrigationConsole : RiskManagementPlan {
        attribute redefines recordId = "RMP-IRR-001";
        attribute redefines title = "Irrigation console risk management plan";
        attribute redefines scope = "Pressure regulation, priming integrity, reservoir depletion, and post-market risk feedback";
    }

    part riskReportIrrigationConsole : RiskManagementReport {
        attribute redefines recordId = "RMR-IRR-001";
        attribute redefines title = "Irrigation console risk management report";
        attribute redefines conclusion = "Overall residual risk remains acceptable for the intended arthroscopy workflow with current controls and monitoring.";
    }

    part evidenceFormativePrimeWorkflow : ComplianceEvidence {
        attribute redefines recordId = "EV-IRR-001";
        attribute redefines title = "Prime workflow formative findings";
        attribute redefines artifactType = "Formative Evaluation Report";
    }

    part evidenceSummativePrimeWorkflow : ComplianceEvidence {
        attribute redefines recordId = "EV-IRR-002";
        attribute redefines title = "Prime workflow summative evidence";
        attribute redefines artifactType = "Usability Test Report";
    }

    part signalReservoirCollapseTrend : ProductionPostProductionSignal {
        attribute redefines recordId = "PMS-IRR-001";
        attribute redefines title = "Reservoir depletion complaint trend review";
        attribute redefines artifactType = "Post-market complaint trend";
        attribute redefines signalId = "SIG-IRR-001";
        attribute redefines sourceType = "Complaint trend and service review";
    }

    part releaseBaseline20 : ReleaseBaseline {
        attribute redefines recordId = "REL-IRR-001";
        attribute redefines title = "Release baseline 2.0";
        attribute redefines version = "2.0.0";
    }

    action swDevProcessIrrigationController : SoftwareDevelopmentProcess {
        attribute redefines name = "Irrigation controller software development process";
    }

    action swMaintProcessIrrigationController : SoftwareMaintenanceProcess {
        attribute redefines name = "Irrigation controller software maintenance process";
    }

    action swRequirementsPressureControl : SoftwareRequirementsAnalysisActivity {
        attribute redefines name = "Analyze pressure control and alarm requirements";
    }

    action swArchitecturePressureControl : SoftwareArchitecturalDesignActivity {
        attribute redefines name = "Design pressure control and alarm software architecture";
    }

    action swVerificationPressureControl : SoftwareVerificationActivity {
        attribute redefines name = "Verify pressure regulation and reservoir alarm implementation";
    }

    action swProblemResolutionPressureSpike : ProblemResolutionActivity {
        attribute redefines name = "Resolve pressure spike anomaly during cassette replacement";
    }

    part testPrimeWorkflow : Test {
        attribute redefines testId = "TC-IRR-UI-001";
        attribute redefines name = "Prime workflow usability test";
    }

    part testPressureControl : Test {
        attribute redefines testId = "TC-IRR-SYS-001";
        attribute redefines name = "Pressure control verification test";
    }

    part testReservoirAlarm : Test {
        attribute redefines testId = "TC-IRR-SYS-002";
        attribute redefines name = "Reservoir depletion alarm verification";
    }

    connection : AddressesUseError connect uiRequirement ::> uiReqPrimeConfirmation to useError ::> useErrStartBeforePrime;
    connection : AnalyzesUseError connect analysis ::> useErrorAnalysisPrimeWorkflow to useError ::> useErrStartBeforePrime;
    connection : SpecifiesScenario connect specification ::> useSpecPrimeWorkflow to scenario ::> primeWorkflowScenario;
    connection : ExposesUseError connect scenario ::> primeWorkflowScenario to useError ::> useErrStartBeforePrime;
    connection : ContributesToHazard connect useError ::> useErrStartBeforePrime to hazard ::> hazAirInLine;
    connection : Refines connect refined ::> srPrimeInterlock to refiner ::> uiReqPrimeConfirmation;
    connection : Refines connect refined ::> ucPrimeCassette to refiner ::> procPrimeCassette;
    connection : Refines connect refined ::> ucDeliverIrrigation to refiner ::> procDeliverIrrigation;
    connection : Refines connect refined ::> ucRespondToReservoirAlarm to refiner ::> procRespondToReservoirAlarm;
    connection : HasSubProcedure connect procedure ::> pathwayArthroscopyIrrigation to subProcedure ::> procPrimeCassette;
    connection : HasSubProcedure connect procedure ::> pathwayArthroscopyIrrigation to subProcedure ::> procDeliverIrrigation;
    connection : HasSubProcedure connect procedure ::> pathwayArthroscopyIrrigation to subProcedure ::> procRespondToReservoirAlarm;
    connection : HasSubProcedure connect procedure ::> procDeliverIrrigation to subProcedure ::> procPrimeCassette;
    connection : HasSubProcedure connect procedure ::> procDeliverIrrigation to subProcedure ::> procRespondToReservoirAlarm;
    connection : PerformedBy connect procedure ::> procPrimeCassette to performer ::> circulatingNurse;
    connection : PerformedBy connect procedure ::> procDeliverIrrigation to performer ::> arthroscopySurgeon;
    connection : PerformedBy connect procedure ::> procRespondToReservoirAlarm to performer ::> circulatingNurse;
    connection : PerformedOn connect procedure ::> procDeliverIrrigation to subject ::> patientCase;
    connection : PerformedOn connect procedure ::> procRespondToReservoirAlarm to subject ::> patientCase;
    connection : HasAnatomicalSite connect subject ::> procDeliverIrrigation to site ::> kneeJointSurgicalSite;
    connection : HasAnatomicalSite connect subject ::> procRespondToReservoirAlarm to site ::> kneeJointSurgicalSite;
    connection : OccursIn connect procedure ::> procPrimeCassette to environment ::> operatingRoom;
    connection : OccursIn connect procedure ::> procDeliverIrrigation to environment ::> operatingRoom;
    connection : OccursIn connect procedure ::> procRespondToReservoirAlarm to environment ::> operatingRoom;
    connection : AppliesEnvironmentQualifier connect environment ::> operatingRoom to qualifier ::> sterileField;
    connection : UsesMethod connect procedure ::> procDeliverIrrigation to method ::> methodPeristalticPressureControl;
    connection : UsesMethod connect procedure ::> procRespondToReservoirAlarm to method ::> methodPeristalticPressureControl;
    connection : UsesRoute connect procedure ::> procDeliverIrrigation to route ::> routeArthroscopicCannulaDelivery;
    connection : UsesResource connect procedure ::> procPrimeCassette to resource ::> disposableCassette;
    connection : UsesResource connect procedure ::> procPrimeCassette to resource ::> salineIrrigationFluid;
    connection : UsesResource connect procedure ::> procDeliverIrrigation to resource ::> disposableCassette;
    connection : UsesResource connect procedure ::> procDeliverIrrigation to resource ::> footswitchPedal;
    connection : UsesResource connect procedure ::> procRespondToReservoirAlarm to resource ::> reservoirScale;
    connection : HasEquipment connect environment ::> operatingRoom to equipment ::> disposableCassette;
    connection : HasEquipment connect environment ::> operatingRoom to equipment ::> footswitchPedal;
    connection : HasEquipment connect environment ::> operatingRoom to equipment ::> reservoirScale;
    connection : HasPersonnel connect environment ::> operatingRoom to personnel ::> circulatingNurse;
    connection : HasPersonnel connect environment ::> operatingRoom to personnel ::> arthroscopySurgeon;
    connection : ContainsSubstance connect environment ::> operatingRoom to substance ::> salineIrrigationFluid;
    connection : ProducesObservation connect procedure ::> procDeliverIrrigation to observation ::> obsJointDistensionMaintained;
    connection : ObservesSubject connect observation ::> obsJointDistensionMaintained to subject ::> patientCase;
    connection : ObservesSubject connect observation ::> obsJointDistensionMaintained to subject ::> kneeJointSurgicalSite;
    connection : ObservesSubject connect observation ::> obsJointDistensionMaintained to subject ::> morphologyJointSpaceExpanded;
    connection : AffectsMorphology connect procedure ::> procDeliverIrrigation to morphology ::> morphologyJointSpaceExpanded;
    connection : Satisfy connect satisfiedBy ::> primeConfirmationDialog to satisfies ::> uiReqPrimeConfirmation;

    connection : SupportsOperatingFunction connect performance ::> epControlledIrrigationPressure to function ::> pofMaintainFieldDistension;
    connection : DefinesLossCondition connect performance ::> epControlledIrrigationPressure to condition ::> lossOfControlledIrrigation;
    connection : Preserves connect function ::> sfMaintainSafePressure to performance ::> epControlledIrrigationPressure;
    connection : ProtectsEssentialPerformance connect control ::> rcPressureLimiter to performance ::> epControlledIrrigationPressure;
    connection : ImplementsRiskControl connect implementer ::> sfMaintainSafePressure to control ::> rcPressureLimiter;
    connection : AppliesStandardRequirement connect standardRequirement ::> collateralAlarmStandard to subject ::> epControlledIrrigationPressure;
    connection : AppliesStandardRequirement connect standardRequirement ::> particularIrrigationStandard to subject ::> pofMaintainFieldDistension;
    connection : PlansRiskManagement connect plan ::> riskPlanIrrigationConsole to subject ::> riskPressureInjury;
    connection : PlansRiskManagement connect plan ::> riskPlanIrrigationConsole to subject ::> fmeaPressureAndAlarmIntegrity;
    connection : PlansRiskManagement connect plan ::> riskPlanIrrigationConsole to subject ::> residualRiskEvalPressureControl;
    connection : PlansRiskManagement connect plan ::> riskPlanIrrigationConsole to subject ::> benefitRiskAssessmentIrrigation;
    connection : ConcludesOverallResidualRisk connect report ::> riskReportIrrigationConsole to evaluation ::> overallResidualRiskEvalIrrigation;
    connection : MonitorsRiskSubject connect signal ::> signalReservoirCollapseTrend to subject ::> harmLossOfVisualization;
    connection : MonitorsRiskSubject connect signal ::> signalReservoirCollapseTrend to subject ::> rcReservoirLowAlarm;

    connection : Satisfy connect satisfiedBy ::> swItemPressureController to satisfies ::> swrPressureControlLoop;
    connection : Satisfy connect satisfiedBy ::> swItemAlarmSupervisor to satisfies ::> swrAlarmCoordinator;

    connection : EvaluatesRequirement connect evaluation ::> formativeEvalPrimeWorkflow to uiRequirement ::> uiReqPrimeConfirmation;
    connection : EvaluatesRequirement connect evaluation ::> summativeEvalPrimeWorkflow to uiRequirement ::> uiReqPrimeConfirmation;

    connection : Verify connect verifiedBy ::> testPrimeWorkflow to verifies ::> uiReqPrimeConfirmation;
    connection : Verify connect verifiedBy ::> testPrimeWorkflow to verifies ::> summativeEvalPrimeWorkflow;
    connection : Verify connect verifiedBy ::> testPrimeWorkflow to verifies ::> srPrimeInterlock;
    connection : Verify connect verifiedBy ::> testPrimeWorkflow to verifies ::> rcPrimeCompletionInterlock;
    connection : Verify connect verifiedBy ::> testPressureControl to verifies ::> srPressureRegulation;
    connection : Verify connect verifiedBy ::> testPressureControl to verifies ::> swrPressureControlLoop;
    connection : Verify connect verifiedBy ::> testPressureControl to verifies ::> rcPressureLimiter;
    connection : Verify connect verifiedBy ::> testPressureControl to verifies ::> dcPressurePlausibilityCheck;
    connection : Verify connect verifiedBy ::> testReservoirAlarm to verifies ::> srReservoirLowAlarm;
    connection : Verify connect verifiedBy ::> testReservoirAlarm to verifies ::> srAlarmAudibility;
    connection : Verify connect verifiedBy ::> testReservoirAlarm to verifies ::> swrReservoirEstimation;
    connection : Verify connect verifiedBy ::> testReservoirAlarm to verifies ::> swrAlarmCoordinator;
    connection : Verify connect verifiedBy ::> testReservoirAlarm to verifies ::> rcReservoirLowAlarm;

    connection : GovernsActivity connect process ::> swDevProcessIrrigationController to activity ::> swRequirementsPressureControl;
    connection : GovernsActivity connect process ::> swDevProcessIrrigationController to activity ::> swArchitecturePressureControl;
    connection : GovernsActivity connect process ::> swDevProcessIrrigationController to activity ::> swVerificationPressureControl;
    connection : GovernsActivity connect process ::> swMaintProcessIrrigationController to activity ::> swProblemResolutionPressureSpike;

    connection : ProducesWorkProduct connect activity ::> swRequirementsPressureControl to workProduct ::> swReqSpecIrrigationController;
    connection : ProducesWorkProduct connect activity ::> swArchitecturePressureControl to workProduct ::> swArchIrrigationController;
    connection : ProducesWorkProduct connect activity ::> swArchitecturePressureControl to workProduct ::> swDesignPrimeWorkflow;
    connection : ProducesWorkProduct connect activity ::> swProblemResolutionPressureSpike to workProduct ::> problemPressureSpike;
    connection : ProducesWorkProduct connect activity ::> swProblemResolutionPressureSpike to workProduct ::> changePressureSpike;

    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> swPlanIrrigationController;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> swReqSpecIrrigationController;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> swArchIrrigationController;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> swDesignPrimeWorkflow;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> soupUiFramework;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> anomalyPressureSpike;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> problemPressureSpike;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> changePressureSpike;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> releaseBaseline20;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> useSpecPrimeWorkflow;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> useErrorAnalysisPrimeWorkflow;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> formativeEvalPrimeWorkflow;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> summativeEvalPrimeWorkflow;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> fmeaPressureAndAlarmIntegrity;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> ftaReservoirAlarmLoss;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> riskPlanIrrigationConsole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> riskReportIrrigationConsole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> collateralAlarmStandard;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> particularIrrigationStandard;

    connection : Evidences connect evidence ::> evidenceFormativePrimeWorkflow to subject ::> formativeEvalPrimeWorkflow;
    connection : Evidences connect evidence ::> evidenceFormativePrimeWorkflow to subject ::> useErrorAnalysisPrimeWorkflow;
    connection : Evidences connect evidence ::> evidenceSummativePrimeWorkflow to subject ::> summativeEvalPrimeWorkflow;
    connection : Evidences connect evidence ::> evidenceSummativePrimeWorkflow to subject ::> uiReqPrimeConfirmation;
    connection : Evidences connect evidence ::> signalReservoirCollapseTrend to subject ::> overallResidualRiskEvalIrrigation;

    connection : Documents connect record ::> releaseBaseline20 to subject ::> swSystemIrrigationController;
    connection : Documents connect record ::> releaseBaseline20 to subject ::> swItemPressureController;
    connection : Documents connect record ::> releaseBaseline20 to subject ::> swItemAlarmSupervisor;
    connection : Documents connect record ::> releaseBaseline20 to subject ::> soupEvalUiFramework;
}
