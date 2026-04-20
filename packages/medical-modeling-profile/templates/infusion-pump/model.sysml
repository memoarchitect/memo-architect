// ============================================================================
// MEMO Medical — Infusion Pump Starter Template (Comprehensive)
// CoSMA-layered elements across all 9 domains
//
// Layers: business | requirements | risk | functional | logical |
//         physical | software | interfaces | verification | ui
//
// Key corrections from v1:
//   - Hazard, Risk, RiskControl are requirement defs (not part defs)
//   - Full business analysis layer (actors, stakeholders, use cases)
//   - Scenarios for use cases
//   - Physical + software architecture separated
//   - Proper ISO 14971 risk chain: Hazard → HazardousSituation → Harm
// ============================================================================

package InfusionPump {
    import MEMO_Ontology_MedicalProcess::*;

    // ═══════════════════════════════════════════════════════════════════════
    // BUSINESS ANALYSIS LAYER — Who uses this and why?
    // ═══════════════════════════════════════════════════════════════════════

    part clinician : Actor {
        attribute redefines name = "Clinician";
    }

    part patient : Stakeholder {
        attribute redefines name = "Patient";
    }

    part biomedEngineer : Stakeholder {
        attribute redefines name = "Biomedical Engineer";
    }

    part regulatoryBody : Stakeholder {
        attribute redefines name = "Regulatory Body (FDA/Notified Body)";
    }

    // Use Cases
    action ucProgramInfusion : UseCase {
        attribute redefines name = "Program Infusion";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "User Goal";
    }

    action ucMonitorInfusion : UseCase {
        attribute redefines name = "Monitor Infusion";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "User Goal";
    }

    action ucRespondToAlarm : UseCase {
        attribute redefines name = "Respond to Alarm";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "Subfunction";
    }

    // Scenarios
    action normalInfusionScenario : Scenario {
        attribute redefines name = "Normal Infusion Delivery";
    }

    action occlusionAlarmScenario : Scenario {
        attribute redefines name = "Occlusion Alarm Response";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REQUIREMENTS LAYER — Needs → System Reqs → Software Reqs
    // ═══════════════════════════════════════════════════════════════════════

    // User Needs
    requirement unAccurateDelivery : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-001";
        attribute redefines title = "Accurate Medication Delivery";
        doc /* The clinician needs the pump to deliver medication at the
             * prescribed rate with clinically acceptable accuracy. */
    }

    requirement unOcclusionAlert : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-002";
        attribute redefines title = "Occlusion Alerting";
        doc /* The clinician needs to be alerted promptly when the
             * infusion line is occluded. */
    }

    requirement unFreeFlowPrevention : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-003";
        attribute redefines title = "Free-Flow Prevention";
        doc /* The patient needs protection from uncontrolled
             * gravity-driven free-flow of medication. */
    }

    // System Requirements
    requirement sysReqFlowAccuracy : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "SYS-REQ-001";
        attribute redefines title = "Flow Rate Accuracy";
        doc /* The pump shall deliver medication at the prescribed flow rate
             * within +/- 5% accuracy across the range 1-999 mL/hr. */
    }

    requirement sysReqOcclusionDetect : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "SYS-REQ-002";
        attribute redefines title = "Occlusion Detection";
        doc /* The pump shall detect occlusion within 30 seconds and
             * generate an audible and visual alarm. */
    }

    requirement sysReqAntiFreeFlow : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "SYS-REQ-003";
        attribute redefines title = "Anti-Free-Flow Protection";
        doc /* The pump shall prevent free-flow through a mechanical
             * anti-free-flow mechanism. */
    }

    requirement sysReqAlarmVolume : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "SYS-REQ-004";
        attribute redefines title = "Alarm Audibility";
        doc /* All high-priority alarms shall be audible at 1 meter
             * with minimum 65 dBA per IEC 60601-1-8. */
    }

    // Software Requirements
    requirement swReqFlowRegulation : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-001";
        attribute redefines title = "Flow Rate Regulation Algorithm";
        doc /* The software shall calculate motor step rate to achieve
             * the prescribed flow rate within +/- 5%. */
    }

    requirement swReqOcclusionMonitor : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-002";
        attribute redefines title = "Occlusion Pressure Monitoring";
        doc /* The software shall monitor line pressure at >= 10 Hz and
             * trigger an occlusion alarm when threshold is exceeded. */
    }

    requirement swReqAlarmManager : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-003";
        attribute redefines title = "Alarm Management";
        doc /* The software shall manage alarm priority, escalation,
             * and silencing per IEC 60601-1-8. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RISK LAYER — ISO 14971 risk chain (all are requirement defs)
    // Hazard → causes → HazardousSituation → leadsTo → Harm
    // RiskControl → mitigates → Hazard
    // ═══════════════════════════════════════════════════════════════════════

    // Hazards
    requirement hazOverInfusion : Hazard {
        attribute redefines hazardId = "HAZ-001";
        attribute redefines title = "Over-Infusion";
        doc /* Software or hardware failure causes medication delivery
             * rate to exceed the prescribed rate. */
    }

    requirement hazUnderInfusion : Hazard {
        attribute redefines hazardId = "HAZ-002";
        attribute redefines title = "Under-Infusion";
        doc /* Undetected occlusion or failure causes patient to receive
             * insufficient medication. */
    }

    requirement hazFreeFlow : Hazard {
        attribute redefines hazardId = "HAZ-003";
        attribute redefines title = "Free-Flow";
        doc /* Uncontrolled gravity-driven flow when pump mechanism
             * is disengaged or door is opened. */
    }

    // Hazardous Situations
    requirement hsExcessiveDose : HazardousSituation {
        attribute redefines hsId = "HS-001";
        attribute redefines title = "Patient receives excessive medication dose";
    }

    requirement hsInsufficientDose : HazardousSituation {
        attribute redefines hsId = "HS-002";
        attribute redefines title = "Patient receives insufficient medication";
    }

    requirement hsUncontrolledFlow : HazardousSituation {
        attribute redefines hsId = "HS-003";
        attribute redefines title = "Uncontrolled bolus delivery via gravity";
    }

    // Harms
    requirement harmAdverseDrugReaction : Harm {
        attribute redefines harmId = "HARM-001";
        attribute redefines title = "Adverse drug reaction from overdose";
        attribute redefines severity = SeverityLevel::Catastrophic;
    }

    requirement harmTherapyFailure : Harm {
        attribute redefines harmId = "HARM-002";
        attribute redefines title = "Therapy failure from under-dosing";
        attribute redefines severity = SeverityLevel::Serious;
    }

    // Risks (pre/post mitigation assessment)
    requirement riskOverInfusion : Risk {
        attribute redefines riskId = "RISK-001";
        attribute redefines title = "Over-infusion risk assessment";
        attribute redefines severityPre = SeverityLevel::Catastrophic;
        attribute redefines probabilityPre = ProbabilityLevel::Remote;
        attribute redefines riskAcceptance = RiskAcceptance::Unacceptable;
    }

    // Risk Controls
    requirement rcFlowRateLimiter : RiskControl {
        attribute redefines rcId = "RC-001";
        attribute redefines title = "Software Flow Rate Limiter";
        doc /* Software enforces maximum flow rate regardless of user input. */
    }

    requirement rcOcclusionAlarm : RiskControl {
        attribute redefines rcId = "RC-002";
        attribute redefines title = "Occlusion Detection and Alarm";
        doc /* Pressure-based occlusion detection with alarm within 30s. */
    }

    requirement rcAntiFreeFlowClamp : RiskControl {
        attribute redefines rcId = "RC-003";
        attribute redefines title = "Anti-Free-Flow Clamp";
        doc /* Mechanical clamp engages when pump door opens. */
    }

    // Risk relationships (typed connections)
    connection : Mitigates connect control ::> rcFlowRateLimiter to hazard ::> hazOverInfusion;
    connection : Mitigates connect control ::> rcOcclusionAlarm to hazard ::> hazUnderInfusion;
    connection : Mitigates connect control ::> rcAntiFreeFlowClamp to hazard ::> hazFreeFlow;
    connection : Causes connect hazard ::> hazOverInfusion to situation ::> hsExcessiveDose;
    connection : Causes connect hazard ::> hazUnderInfusion to situation ::> hsInsufficientDose;
    connection : Causes connect hazard ::> hazFreeFlow to situation ::> hsUncontrolledFlow;
    connection : LeadsTo connect situation ::> hsExcessiveDose to harm ::> harmAdverseDrugReaction;
    connection : LeadsTo connect situation ::> hsInsufficientDose to harm ::> harmTherapyFailure;

    // ═══════════════════════════════════════════════════════════════════════
    // FUNCTIONAL LAYER — What the system does
    // ═══════════════════════════════════════════════════════════════════════

    action sfRegulateFlow : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Regulate Flow Rate";
        doc /* Calculate and control motor speed to deliver prescribed rate. */
    }

    action sfDetectOcclusion : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Detect Occlusion";
        doc /* Monitor line pressure and detect occlusion condition. */
    }

    action sfManageAlarms : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Manage Alarms";
        doc /* Prioritize, escalate, and present alarms to clinician. */
    }

    action sfDisplayStatus : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Display Infusion Status";
        doc /* Show flow rate, volume infused, time remaining. */
    }

    action cfCalculateStepRate : Function {
        attribute redefines scope = FunctionScope::Component;
        attribute redefines name = "Calculate Motor Step Rate";
    }

    action cfReadPressureSensor : Function {
        attribute redefines scope = FunctionScope::Component;
        attribute redefines name = "Read Pressure Sensor";
    }

    action uaSetFlowRate : UserActivity {
        attribute redefines name = "Set Flow Rate";
    }

    action uaAcknowledgeAlarm : UserActivity {
        attribute redefines name = "Acknowledge Alarm";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGICAL ARCHITECTURE LAYER — System decomposition
    // ═══════════════════════════════════════════════════════════════════════

    part infusionPumpSystem : System {
        attribute redefines name = "Infusion Pump System";
    }

    part hospitalNetwork : SystemExternal {
        attribute redefines name = "Hospital Information System";
    }

    part pumpSubsystem : Subsystem {
        attribute redefines name = "Pump Mechanism Subsystem";
    }

    part controlSubsystem : Subsystem {
        attribute redefines name = "Control Electronics Subsystem";
    }

    part uiSubsystem : Subsystem {
        attribute redefines name = "User Interface Subsystem";
    }

    // Environment
    part clinicalEnvironment : UseEnvironment {
        attribute redefines name = "Clinical Environment";
        attribute redefines temperature = "15-35°C";
        attribute redefines humidity = "20-80% RH";
    }

    part clinicalSterilityQualifier : ClinicalEnvironmentQualifier {
        attribute redefines name = "Controlled clinical cleanliness";
        attribute redefines qualifierType = "Clinical cleanliness";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHYSICAL ARCHITECTURE LAYER — Hardware components
    // ═══════════════════════════════════════════════════════════════════════

    part mainPCB : ElectricalComponent {
        attribute redefines name = "Main Control PCB";
        attribute redefines voltageRating = "3.3V/5V";
    }

    part pressureSensor : ElectricalComponent {
        attribute redefines name = "Line Pressure Sensor";
        attribute redefines voltageRating = "3.3V";
    }

    part stepperMotor : ElectricalComponent {
        attribute redefines name = "Stepper Motor";
    }

    part displayAssembly : ElectricalComponent {
        attribute redefines name = "LCD Display Assembly";
    }

    part pumpHousing : MechanicalComponent {
        attribute redefines name = "Pump Housing";
    }

    part antiFreeFlowMechanism : MechanicalComponent {
        attribute redefines name = "Anti-Free-Flow Clamp Mechanism";
    }

    part mainProcessor : Microcontroller {
        attribute redefines name = "Main Processor (ARM Cortex-M4)";
        attribute redefines numberOfCores = 1;
        attribute redefines ram = 256;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SOFTWARE ARCHITECTURE LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part pumpControlSoftware : Software {
        attribute redefines name = "Pump Control Software";
        attribute redefines safetyClassification = "C";
        attribute redefines level = "System";
    }

    part flowController : SoftwareComponent {
        attribute redefines name = "Flow Rate Controller";
        attribute redefines safetyClassification = "C";
    }

    part occlusionDetector : SoftwareComponent {
        attribute redefines name = "Occlusion Detector";
        attribute redefines safetyClassification = "C";
    }

    part alarmManager : SoftwareComponent {
        attribute redefines name = "Alarm Manager";
        attribute redefines safetyClassification = "B";
    }

    part displayDriver : SoftwareComponent {
        attribute redefines name = "Display Driver";
        attribute redefines safetyClassification = "B";
    }

    part commModule : SoftwareComponent {
        attribute redefines name = "Communication Module";
        attribute redefines safetyClassification = "A";
    }

    part pumpFirmware : Firmware {
        attribute redefines name = "Pump Motor Firmware";
        attribute redefines safetyClassification = "C";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MEDICAL DEVELOPMENT BACKBONE — 60601 / 62304 / QMS trace artifacts
    // ═══════════════════════════════════════════════════════════════════════

    requirement uiReqAlarmAcknowledgement : Requirement {
        attribute redefines category = RequirementCategory::Interface;
        attribute redefines domain = "UI";
        attribute redefines title = "Alarm acknowledgement shall require explicit user confirmation";
    }

    requirement useErrAlarmSilenced : UseError {
        attribute redefines title = "Clinician silences an alarm without resolving the infusion issue";
    }

    action alarmAckScenario : HazardRelatedUseScenario {
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

    part swReqSpecPumpController : SoftwareRequirementsArtifact {
        attribute redefines title = "Pump controller software requirements specification";
    }

    part swArchPumpController : SoftwareArchitectureArtifact {
        attribute redefines title = "Pump controller software architecture";
    }

    part swDesignAlarmHandling : SoftwareDetailedDesign {
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

    action swDevProcessPumpController : SoftwareDevelopmentProcess {
        attribute redefines name = "Pump controller software development process";
    }

    action swMaintProcessPumpController : SoftwareMaintenanceProcess {
        attribute redefines name = "Pump controller software maintenance process";
    }

    action swRequirementsAlarmHandling : SoftwareRequirementsAnalysisActivity {
        attribute redefines name = "Analyze alarm handling software requirements";
    }

    action swArchitectureAlarmHandling : SoftwareArchitecturalDesignActivity {
        attribute redefines name = "Design alarm handling software architecture";
    }

    action swVerificationAlarmHandling : SoftwareVerificationActivity {
        attribute redefines name = "Verify alarm handling implementation";
    }

    action swProblemResolutionAlarmDelay : ProblemResolutionActivity {
        attribute redefines name = "Resolve alarm acknowledgement latency anomaly";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERFACES & PORTS LAYER
    // ═══════════════════════════════════════════════════════════════════════

    port pressureSensorPort : Port { }
    port motorControlPort : Port { }
    port displayPort : Port { }
    port networkPort : Port {
        attribute redefines protocol = "Ethernet";
        attribute redefines direction = PortDirection::Bidirectional;
    }
    port usbServicePort : Port {
        attribute redefines protocol = "USB";
        attribute redefines direction = PortDirection::Bidirectional;
    }
    port powerInput : Port {
        attribute redefines protocol = "Power";
        attribute redefines direction = PortDirection::Bidirectional;
    }

    interface def PressureDataInterface :> SoftwareInterface { }
    interface def MotorCommandInterface :> SoftwareInterface { }
    interface def AlarmNotificationInterface :> SoftwareInterface { }

    // ═══════════════════════════════════════════════════════════════════════
    // UI WIREFRAME LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part mainScreen : UIScreen {
        attribute redefines name = "Main Infusion Screen";
    }

    part alarmScreen : UIScreen {
        attribute redefines name = "Alarm Display Screen";
    }

    part statusPanel : UIPanel {
        attribute redefines name = "Infusion Status Panel";
    }

    part rateDisplay : UIElement {
        attribute redefines name = "Flow Rate Display";
    }

    part volumeDisplay : UIElement {
        attribute redefines name = "Volume Infused Display";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICATION LAYER — Tests
    // ═══════════════════════════════════════════════════════════════════════

    part testFlowAccuracy : Test {
        attribute redefines testId = "TC-001";
        attribute redefines name = "Flow Rate Accuracy Verification";
    }

    part testOcclusionDetection : Test {
        attribute redefines testId = "TC-002";
        attribute redefines name = "Occlusion Detection Timing Test";
    }

    part testFreeFlowPrevention : Test {
        attribute redefines testId = "TC-003";
        attribute redefines name = "Anti-Free-Flow Mechanism Test";
    }

    part testAlarmAudibility : Test {
        attribute redefines testId = "TC-004";
        attribute redefines name = "Alarm Audibility at 1m Test";
    }

    part testAlarmUiWorkflow : Test {
        attribute redefines testId = "TC-UI-001";
        attribute redefines name = "Alarm acknowledgement workflow test";
    }

    part testSoftwareFlowControl : Test {
        attribute redefines testId = "TC-SW-001";
        attribute redefines name = "Software flow control verification";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRACEABILITY — Cross-layer relationships
    // ═══════════════════════════════════════════════════════════════════════

    // Stable requirement and operational semantics
    connection : Derives connect source ::> unAccurateDelivery to derived ::> sysReqFlowAccuracy;
    connection : Derives connect source ::> unOcclusionAlert to derived ::> sysReqOcclusionDetect;
    connection : Derives connect source ::> unFreeFlowPrevention to derived ::> sysReqAntiFreeFlow;
    connection : Derives connect source ::> unOcclusionAlert to derived ::> sysReqAlarmVolume;
    connection : Refines connect refined ::> unAccurateDelivery to refiner ::> ucProgramInfusion;
    connection : Refines connect refined ::> unOcclusionAlert to refiner ::> ucRespondToAlarm;
    connection : Refines connect refined ::> ucProgramInfusion to refiner ::> normalInfusionScenario;
    connection : Refines connect refined ::> ucRespondToAlarm to refiner ::> occlusionAlarmScenario;

    connection : Derives connect source ::> sysReqFlowAccuracy to derived ::> swReqFlowRegulation;
    connection : Derives connect source ::> sysReqOcclusionDetect to derived ::> swReqOcclusionMonitor;
    connection : Derives connect source ::> sysReqAlarmVolume to derived ::> swReqAlarmManager;

    // Function allocation
    connection : AllocateTo connect function ::> sfRegulateFlow to structure ::> flowController;
    connection : AllocateTo connect function ::> sfDetectOcclusion to structure ::> occlusionDetector;
    connection : AllocateTo connect function ::> sfManageAlarms to structure ::> alarmManager;
    connection : AllocateTo connect function ::> sfDisplayStatus to structure ::> displayDriver;

    // Satisfy (design satisfies requirement)
    connection : AppliesEnvironmentQualifier connect environment ::> clinicalEnvironment to qualifier ::> clinicalSterilityQualifier;
    connection : Satisfy connect satisfiedBy ::> pumpSubsystem to satisfies ::> sysReqFlowAccuracy;
    connection : Satisfy connect satisfiedBy ::> controlSubsystem to satisfies ::> sysReqOcclusionDetect;
    connection : Satisfy connect satisfiedBy ::> pumpSubsystem to satisfies ::> sysReqAntiFreeFlow;
    connection : Satisfy connect satisfiedBy ::> uiSubsystem to satisfies ::> sysReqAlarmVolume;
    connection : Satisfy connect satisfiedBy ::> flowController to satisfies ::> swReqFlowRegulation;
    connection : Satisfy connect satisfiedBy ::> occlusionDetector to satisfies ::> swReqOcclusionMonitor;
    connection : Satisfy connect satisfiedBy ::> alarmManager to satisfies ::> swReqAlarmManager;

    // Verify (test verifies requirement)
    connection : Verify connect verifiedBy ::> testFlowAccuracy to verifies ::> sysReqFlowAccuracy;
    connection : Verify connect verifiedBy ::> testOcclusionDetection to verifies ::> sysReqOcclusionDetect;
    connection : Verify connect verifiedBy ::> testFreeFlowPrevention to verifies ::> sysReqAntiFreeFlow;
    connection : Verify connect verifiedBy ::> testAlarmAudibility to verifies ::> sysReqAlarmVolume;
    connection : Verify connect verifiedBy ::> testSoftwareFlowControl to verifies ::> swReqFlowRegulation;
    connection : Verify connect verifiedBy ::> testSoftwareFlowControl to verifies ::> swReqOcclusionMonitor;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> swReqAlarmManager;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> uiReqAlarmAcknowledgement;
    connection : Verify connect verifiedBy ::> testAlarmUiWorkflow to verifies ::> summativeEvalAlarmWorkflow;

    // Verify risk controls
    connection : Verify connect verifiedBy ::> testFlowAccuracy to verifies ::> rcFlowRateLimiter;
    connection : Verify connect verifiedBy ::> testOcclusionDetection to verifies ::> rcOcclusionAlarm;
    connection : Verify connect verifiedBy ::> testFreeFlowPrevention to verifies ::> rcAntiFreeFlowClamp;

    // 60601 usability and essential performance traces
    connection : AddressesUseError connect uiRequirement ::> uiReqAlarmAcknowledgement to useError ::> useErrAlarmSilenced;
    connection : AnalyzesUseError connect analysis ::> useErrorAnalysisAlarmWorkflow to useError ::> useErrAlarmSilenced;
    connection : SpecifiesScenario connect specification ::> useSpecAlarmWorkflow to scenario ::> alarmAckScenario;
    connection : ExposesUseError connect scenario ::> alarmAckScenario to useError ::> useErrAlarmSilenced;
    connection : ContributesToHazard connect useError ::> useErrAlarmSilenced to hazard ::> hazUnderInfusion;
    connection : Refines connect refined ::> sysReqAlarmVolume to refiner ::> uiReqAlarmAcknowledgement;
    connection : Satisfy connect satisfiedBy ::> alarmScreen to satisfies ::> uiReqAlarmAcknowledgement;
    connection : Refines connect refined ::> pofControlledInfusion to refiner ::> sysReqFlowAccuracy;
    connection : SupportsOperatingFunction connect performance ::> epControlledDelivery to function ::> pofControlledInfusion;
    connection : DefinesLossCondition connect performance ::> epControlledDelivery to condition ::> lossOfControlledDelivery;
    connection : Preserves connect function ::> sfMaintainControlledDelivery to performance ::> epControlledDelivery;
    connection : ProtectsEssentialPerformance connect control ::> rcFlowRateLimiter to performance ::> epControlledDelivery;
    connection : ImplementsRiskControl connect implementer ::> sfMaintainControlledDelivery to control ::> rcFlowRateLimiter;
    connection : EvaluatesRequirement connect evaluation ::> formativeEvalAlarmWorkflow to uiRequirement ::> uiReqAlarmAcknowledgement;
    connection : EvaluatesRequirement connect evaluation ::> summativeEvalAlarmWorkflow to uiRequirement ::> uiReqAlarmAcknowledgement;
    connection : AppliesStandardRequirement connect standardRequirement ::> collateralAlarmStandard to subject ::> epControlledDelivery;
    connection : AppliesStandardRequirement connect standardRequirement ::> particularInfusionPumpStandard to subject ::> pofControlledInfusion;

    // 62304 lifecycle and QMS traces
    connection : Satisfy connect satisfiedBy ::> swItemTherapyController to satisfies ::> swReqFlowRegulation;
    connection : Satisfy connect satisfiedBy ::> swItemAlarmSupervisor to satisfies ::> swReqAlarmManager;
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
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swSystemPumpController;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swItemTherapyController;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> swItemAlarmSupervisor;
    connection : Documents connect record ::> releaseBaseline10 to subject ::> soupEvalRtos;
    connection : Evidences connect evidence ::> evidenceFormativeUiFindings to subject ::> formativeEvalAlarmWorkflow;
    connection : Evidences connect evidence ::> evidenceFormativeUiFindings to subject ::> useErrorAnalysisAlarmWorkflow;
    connection : Evidences connect evidence ::> evidenceUsabilitySummary to subject ::> summativeEvalAlarmWorkflow;
    connection : Evidences connect evidence ::> evidenceUsabilitySummary to subject ::> uiReqAlarmAcknowledgement;
    connection : Refines connect refined ::> ucMonitorInfusion to refiner ::> normalInfusionScenario;
}
