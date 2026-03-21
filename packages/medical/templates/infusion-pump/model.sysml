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
    import MEMO_Ontology_Medical::*;

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
    part ucProgramInfusion : UseCase {
        attribute redefines name = "Program Infusion";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "User Goal";
    }

    part ucMonitorInfusion : UseCase {
        attribute redefines name = "Monitor Infusion";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "User Goal";
    }

    part ucRespondToAlarm : UseCase {
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
    requirement unAccurateDelivery : UserNeed {
        attribute redefines reqId = "UN-001";
        attribute redefines title = "Accurate Medication Delivery";
        doc /* The clinician needs the pump to deliver medication at the
             * prescribed rate with clinically acceptable accuracy. */
    }

    requirement unOcclusionAlert : UserNeed {
        attribute redefines reqId = "UN-002";
        attribute redefines title = "Occlusion Alerting";
        doc /* The clinician needs to be alerted promptly when the
             * infusion line is occluded. */
    }

    requirement unFreeFlowPrevention : UserNeed {
        attribute redefines reqId = "UN-003";
        attribute redefines title = "Free-Flow Prevention";
        doc /* The patient needs protection from uncontrolled
             * gravity-driven free-flow of medication. */
    }

    // System Requirements
    requirement sysReqFlowAccuracy : SystemRequirement {
        attribute redefines reqId = "SYS-REQ-001";
        attribute redefines title = "Flow Rate Accuracy";
        doc /* The pump shall deliver medication at the prescribed flow rate
             * within +/- 5% accuracy across the range 1-999 mL/hr. */
    }

    requirement sysReqOcclusionDetect : SystemRequirement {
        attribute redefines reqId = "SYS-REQ-002";
        attribute redefines title = "Occlusion Detection";
        doc /* The pump shall detect occlusion within 30 seconds and
             * generate an audible and visual alarm. */
    }

    requirement sysReqAntiFreeFlow : SystemRequirement {
        attribute redefines reqId = "SYS-REQ-003";
        attribute redefines title = "Anti-Free-Flow Protection";
        doc /* The pump shall prevent free-flow through a mechanical
             * anti-free-flow mechanism. */
    }

    requirement sysReqAlarmVolume : SystemRequirement {
        attribute redefines reqId = "SYS-REQ-004";
        attribute redefines title = "Alarm Audibility";
        doc /* All high-priority alarms shall be audible at 1 meter
             * with minimum 65 dBA per IEC 60601-1-8. */
    }

    // Software Requirements
    requirement swReqFlowRegulation : SoftwareRequirement {
        attribute redefines reqId = "SW-REQ-001";
        attribute redefines title = "Flow Rate Regulation Algorithm";
        doc /* The software shall calculate motor step rate to achieve
             * the prescribed flow rate within +/- 5%. */
    }

    requirement swReqOcclusionMonitor : SoftwareRequirement {
        attribute redefines reqId = "SW-REQ-002";
        attribute redefines title = "Occlusion Pressure Monitoring";
        doc /* The software shall monitor line pressure at >= 10 Hz and
             * trigger an occlusion alarm when threshold is exceeded. */
    }

    requirement swReqAlarmManager : SoftwareRequirement {
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

    action sfRegulateFlow : SystemFunction {
        attribute redefines name = "Regulate Flow Rate";
        doc /* Calculate and control motor speed to deliver prescribed rate. */
    }

    action sfDetectOcclusion : SystemFunction {
        attribute redefines name = "Detect Occlusion";
        doc /* Monitor line pressure and detect occlusion condition. */
    }

    action sfManageAlarms : SystemFunction {
        attribute redefines name = "Manage Alarms";
        doc /* Prioritize, escalate, and present alarms to clinician. */
    }

    action sfDisplayStatus : SystemFunction {
        attribute redefines name = "Display Infusion Status";
        doc /* Show flow rate, volume infused, time remaining. */
    }

    action cfCalculateStepRate : ComponentFunction {
        attribute redefines name = "Calculate Motor Step Rate";
    }

    action cfReadPressureSensor : ComponentFunction {
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
    // INTERFACES & PORTS LAYER
    // ═══════════════════════════════════════════════════════════════════════

    port pressureSensorPort : Port { }
    port motorControlPort : Port { }
    port displayPort : Port { }
    port networkPort : PortEthernet { }
    port usbServicePort : PortUSB { }
    port powerInput : PortPower { }

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

    // ═══════════════════════════════════════════════════════════════════════
    // TRACEABILITY — Cross-layer relationships
    // ═══════════════════════════════════════════════════════════════════════

    // UserNeed → SystemRequirement
    connection : TraceTo connect source ::> unAccurateDelivery to target ::> sysReqFlowAccuracy;
    connection : TraceTo connect source ::> unOcclusionAlert to target ::> sysReqOcclusionDetect;
    connection : TraceTo connect source ::> unFreeFlowPrevention to target ::> sysReqAntiFreeFlow;

    // SystemRequirement → SoftwareRequirement
    connection : TraceTo connect source ::> sysReqFlowAccuracy to target ::> swReqFlowRegulation;
    connection : TraceTo connect source ::> sysReqOcclusionDetect to target ::> swReqOcclusionMonitor;

    // Function allocation
    connection : AllocateTo connect function ::> sfRegulateFlow to structure ::> flowController;
    connection : AllocateTo connect function ::> sfDetectOcclusion to structure ::> occlusionDetector;
    connection : AllocateTo connect function ::> sfManageAlarms to structure ::> alarmManager;

    // Satisfy (design satisfies requirement)
    connection : Satisfy connect satisfiedBy ::> flowController to satisfies ::> swReqFlowRegulation;
    connection : Satisfy connect satisfiedBy ::> occlusionDetector to satisfies ::> swReqOcclusionMonitor;

    // Verify (test verifies requirement)
    connection : Verify connect verifiedBy ::> testFlowAccuracy to verifies ::> sysReqFlowAccuracy;
    connection : Verify connect verifiedBy ::> testOcclusionDetection to verifies ::> sysReqOcclusionDetect;
    connection : Verify connect verifiedBy ::> testFreeFlowPrevention to verifies ::> sysReqAntiFreeFlow;
    connection : Verify connect verifiedBy ::> testAlarmAudibility to verifies ::> sysReqAlarmVolume;

    // Verify risk controls
    connection : Verify connect verifiedBy ::> testFlowAccuracy to verifies ::> rcFlowRateLimiter;
    connection : Verify connect verifiedBy ::> testOcclusionDetection to verifies ::> rcOcclusionAlarm;
    connection : Verify connect verifiedBy ::> testFreeFlowPrevention to verifies ::> rcAntiFreeFlowClamp;
}
