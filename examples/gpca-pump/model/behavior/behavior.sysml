// ============================================================================
// GPCA Infusion Pump — Behavioral Model (M87)
// Hierarchical State Machine & Action Flows
// OFF → ON → IDLE → THERAPY → ACTIVE → BASAL / SQUARE_BOLUS / PATIENT_BOLUS / PAUSED
// 16 transitions with guard conditions, ≥5 action flows
// ============================================================================

package GPCA_Behavior {
    import MEMO_Ontology_MedicalArch::*;
    import MEMO_Ontology_MedicalProcess::*;
    import GPCA_Requirements::*;
    import GPCA_Architecture::*;

    // ═══════════════════════════════════════════════════════════════════════
    // SYSTEM FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    action def sfRegulateFlow :> Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Regulate Drug Flow";
        doc /* Top-level system function: deliver drug at prescribed rate
             * under all operating conditions. */
    }

    action def sfDetectSafetyCondition :> Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Detect Safety Condition";
        doc /* Continuously monitor for air, occlusion, over/under-infusion,
             * reverse flow, and other safety conditions. */
    }

    action def sfManageAlarms :> Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Manage Alarms and Notifications";
        doc /* Prioritize, display, escalate, and resolve alarm conditions
             * per GPCA notification action table. */
    }

    action def sfManagePrescription :> Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Manage Prescription Configuration";
        doc /* Accept, validate, store, and apply prescription parameters
             * from clinician input or pharmacy database. */
    }

    action def sfManageAccess :> Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Manage Access Control";
        doc /* Authenticate users, manage sessions, enforce role-based
             * access to device functions. */
    }

    action def sfLogEvents :> Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Log Events";
        doc /* Record all state changes, alarms, deliveries, and
             * configuration changes with timestamps. */
    }

    // Component functions
    action def cfCalculateFlowRate :> Function {
        attribute redefines scope = FunctionScope::Component;
        attribute redefines name = "Calculate Flow Rate Command";
    }

    action def cfDriveMotor :> Function {
        attribute redefines scope = FunctionScope::Component;
        attribute redefines name = "Drive Pump Motor";
    }

    action def cfReadSensors :> Function {
        attribute redefines scope = FunctionScope::Component;
        attribute redefines name = "Read and Fuse Sensor Data";
    }

    action def cfResolveAlarmPriority :> Function {
        attribute redefines scope = FunctionScope::Component;
        attribute redefines name = "Resolve Alarm Priority";
    }

    action def cfValidatePrescription :> Function {
        attribute redefines scope = FunctionScope::Component;
        attribute redefines name = "Validate Prescription Against Drug Library";
    }

    action def cfManageLockout :> Function {
        attribute redefines scope = FunctionScope::Component;
        attribute redefines name = "Manage Bolus Lockout Timer";
    }

    // Function decomposition
    connection : DecomposedBy connect parent ::> sfRegulateFlow to child ::> cfCalculateFlowRate;
    connection : DecomposedBy connect parent ::> sfRegulateFlow to child ::> cfDriveMotor;
    connection : DecomposedBy connect parent ::> sfDetectSafetyCondition to child ::> cfReadSensors;
    connection : DecomposedBy connect parent ::> sfManageAlarms to child ::> cfResolveAlarmPriority;
    connection : DecomposedBy connect parent ::> sfManagePrescription to child ::> cfValidatePrescription;
    connection : DecomposedBy connect parent ::> sfRegulateFlow to child ::> cfManageLockout;

    // Function → Software Item allocation
    connection : AllocateTo connect function ::> sfRegulateFlow to structure ::> siInfusionManager;
    connection : AllocateTo connect function ::> sfDetectSafetyCondition to structure ::> siAlarmManager;
    connection : AllocateTo connect function ::> sfManageAlarms to structure ::> siNotificationController;
    connection : AllocateTo connect function ::> sfManagePrescription to structure ::> siConfigurationManager;
    connection : AllocateTo connect function ::> sfManageAccess to structure ::> siAuthenticationService;
    connection : AllocateTo connect function ::> sfLogEvents to structure ::> siLoggingService;

    // ═══════════════════════════════════════════════════════════════════════
    // HIERARCHICAL STATE MACHINE — GPCA Mode Control
    // All states modeled as ActionDefinition / ActionUsage
    // ═══════════════════════════════════════════════════════════════════════

    // Top-level states
    action stateOFF : Scenario {
        attribute redefines name = "OFF";
        doc /* System powered off. No delivery. All outputs de-energized. */
    }

    action stateON : Scenario {
        attribute redefines name = "ON";
        doc /* System powered on. Parent state for all operational modes. */
    }

    action stateIDLE : Scenario {
        attribute redefines name = "IDLE";
        doc /* System on, self-test passed. Awaiting prescription configuration.
             * No drug delivery. Display shows IDLE status. */
    }

    action stateTHERAPY : Scenario {
        attribute redefines name = "THERAPY";
        doc /* Active therapy session. Parent state for delivery modes.
             * Prescription loaded and confirmed. */
    }

    action stateACTIVE : Scenario {
        attribute redefines name = "ACTIVE";
        doc /* Active drug delivery. Parent state for specific delivery modes. */
    }

    action stateBASAL : Scenario {
        attribute redefines name = "BASAL";
        doc /* Continuous basal rate delivery at prescribed rate.
             * Default active delivery mode. */
    }

    action stateSQUARE_BOLUS : Scenario {
        attribute redefines name = "SQUARE_BOLUS";
        doc /* Clinician-initiated square bolus delivery at prescribed bolus rate
             * for prescribed duration. Returns to BASAL on completion. */
    }

    action statePATIENT_BOLUS : Scenario {
        attribute redefines name = "PATIENT_BOLUS";
        doc /* Patient-initiated bolus delivery. Subject to lockout period
             * and maximum bolus count. Returns to BASAL on completion. */
    }

    action statePAUSED : Scenario {
        attribute redefines name = "PAUSED";
        doc /* Infusion paused. KVO rate maintained. Waiting for clinician
             * to resume or stop. Entered on inhibit or clinician pause. */
    }

    action stateKVO : Scenario {
        attribute redefines name = "KVO";
        doc /* Keep Vein Open mode. Minimal delivery rate (1 mL/hr).
             * Entered when VTBI reached or reservoir critically low. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATE TRANSITIONS (16 transitions, labeled a–p)
    // ═══════════════════════════════════════════════════════════════════════

    // (a) OFF → ON: System_Start (power switch activated)
    connection : Succession connect source ::> stateOFF to target ::> stateON;

    // (b) ON → IDLE: Self_Test_Pass (POST completes successfully)
    connection : Succession connect source ::> stateON to target ::> stateIDLE;

    // (c) IDLE → THERAPY: Infusion_Initiate (prescription confirmed)
    connection : Succession connect source ::> stateIDLE to target ::> stateTHERAPY;

    // (d) THERAPY → ACTIVE: Delivery_Start (clinician starts delivery)
    connection : Succession connect source ::> stateTHERAPY to target ::> stateACTIVE;

    // (e) ACTIVE → BASAL: Default_Mode (continuous delivery begins)
    connection : Succession connect source ::> stateACTIVE to target ::> stateBASAL;

    // (f) BASAL → SQUARE_BOLUS: Clinician_Bolus_Request
    connection : Succession connect source ::> stateBASAL to target ::> stateSQUARE_BOLUS;

    // (g) BASAL → PATIENT_BOLUS: Patient_Bolus_Request [lockout_elapsed AND count < max]
    connection : Succession connect source ::> stateBASAL to target ::> statePATIENT_BOLUS;

    // (h) SQUARE_BOLUS → BASAL: Bolus_Complete (prescribed volume delivered)
    connection : Succession connect source ::> stateSQUARE_BOLUS to target ::> stateBASAL;

    // (i) PATIENT_BOLUS → BASAL: Bolus_Complete (prescribed dose delivered)
    connection : Succession connect source ::> statePATIENT_BOLUS to target ::> stateBASAL;

    // (j) ACTIVE → PAUSED: Safety_Inhibit (critical alarm) OR Clinician_Pause
    connection : Succession connect source ::> stateACTIVE to target ::> statePAUSED;

    // (k) BASAL → PAUSED: Safety_Inhibit OR Clinician_Pause (from basal)
    connection : Succession connect source ::> stateBASAL to target ::> statePAUSED;

    // (l) PAUSED → ACTIVE: Resume (clinician confirms, condition cleared)
    connection : Succession connect source ::> statePAUSED to target ::> stateACTIVE;

    // (m) PAUSED → IDLE: Stop (clinician stops therapy entirely)
    connection : Succession connect source ::> statePAUSED to target ::> stateIDLE;

    // (n) THERAPY → IDLE: Stop_Infusion (clinician stops from any therapy state)
    connection : Succession connect source ::> stateTHERAPY to target ::> stateIDLE;

    // (o) ACTIVE → KVO: VTBI_Reached OR Reservoir_Critical
    connection : Succession connect source ::> stateACTIVE to target ::> stateKVO;

    // (p) ON → OFF: System_Shutdown (power switch off or critical failure)
    connection : Succession connect source ::> stateON to target ::> stateOFF;

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION FLOW 1: Normal Basal Infusion Delivery
    // startup → configure → validate → deliver → complete
    // ═══════════════════════════════════════════════════════════════════════

    action afBasalStartup : Scenario {
        attribute redefines name = "AF1: Power On and Self-Test";
        doc /* Clinician powers on pump. System executes POST.
             * All sensors, motor, display verified. Enter IDLE. */
    }

    action afBasalConfigure : Scenario {
        attribute redefines name = "AF1: Configure Prescription";
        doc /* Clinician enters prescription: drug, concentration, basal rate,
             * VTBI. System validates against drug library. */
    }

    action afBasalValidate : Scenario {
        attribute redefines name = "AF1: Validate and Confirm";
        doc /* System displays prescription summary. Clinician reviews
             * and confirms. System checks hard/soft limits. */
    }

    action afBasalDeliver : Scenario {
        attribute redefines name = "AF1: Deliver at Basal Rate";
        doc /* System transitions to ACTIVE/BASAL. PID controller regulates
             * motor. Sensors monitor flow, pressure, air. Display updates. */
    }

    action afBasalComplete : Scenario {
        attribute redefines name = "AF1: VTBI Reached — Complete";
        doc /* Delivered volume reaches VTBI. System transitions to KVO.
             * Alarm notifies clinician. Log completion event. */
    }

    connection : Succession connect source ::> afBasalStartup to target ::> afBasalConfigure;
    connection : Succession connect source ::> afBasalConfigure to target ::> afBasalValidate;
    connection : Succession connect source ::> afBasalValidate to target ::> afBasalDeliver;
    connection : Succession connect source ::> afBasalDeliver to target ::> afBasalComplete;

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION FLOW 2: Patient Bolus Request Handling
    // request → lockout check → overdose check → deliver/reject
    // ═══════════════════════════════════════════════════════════════════════

    action afBolusRequest : Scenario {
        attribute redefines name = "AF2: Patient Presses Bolus Button";
        doc /* Patient presses bolus request button during BASAL delivery. */
    }

    action afBolusLockoutCheck : Scenario {
        attribute redefines name = "AF2: Check Lockout Timer";
        doc /* System checks if lockout period has elapsed since last bolus.
             * If not elapsed: reject request, display remaining time. */
    }

    action afBolusOverdoseCheck : Scenario {
        attribute redefines name = "AF2: Check Max Bolus Count";
        doc /* System checks cumulative bolus count against maximum.
             * If exceeded: reject request, alert clinician. */
    }

    action afBolusDeliver : Scenario {
        attribute redefines name = "AF2: Deliver Patient Bolus";
        doc /* Transition to PATIENT_BOLUS. Deliver prescribed bolus dose.
             * Start lockout timer. Increment bolus counter. */
    }

    action afBolusReject : Scenario {
        attribute redefines name = "AF2: Reject Bolus Request";
        doc /* Display rejection reason to patient. Log attempted request.
             * Remain in BASAL mode. */
    }

    action afBolusReturnBasal : Scenario {
        attribute redefines name = "AF2: Return to Basal";
        doc /* Bolus delivery complete. Transition back to BASAL.
             * Log bolus delivered event. */
    }

    connection : Succession connect source ::> afBolusRequest to target ::> afBolusLockoutCheck;
    connection : Succession connect source ::> afBolusLockoutCheck to target ::> afBolusOverdoseCheck;
    connection : Succession connect source ::> afBolusOverdoseCheck to target ::> afBolusDeliver;
    connection : Succession connect source ::> afBolusLockoutCheck to target ::> afBolusReject;
    connection : Succession connect source ::> afBolusDeliver to target ::> afBolusReturnBasal;

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION FLOW 3: Alarm Detection & Notification
    // sensor trigger → priority resolution → visual/audio → inhibit actions
    // ═══════════════════════════════════════════════════════════════════════

    action afAlarmSensorTrigger : Scenario {
        attribute redefines name = "AF3: Sensor Detects Abnormal Condition";
        doc /* Any sensor (air, pressure, flow, temperature, door) detects
             * condition outside normal operating range. */
    }

    action afAlarmPriorityResolve : Scenario {
        attribute redefines name = "AF3: Resolve Alarm Priority";
        doc /* Notification controller looks up condition in 20-row table.
             * Determines priority level and required actions (inhibit infusion,
             * inhibit square bolus, inhibit patient bolus, stop bolus). */
    }

    action afAlarmVisualAudio : Scenario {
        attribute redefines name = "AF3: Activate Visual and Audio Alarms";
        doc /* LED set to priority color (red/yellow/cyan). Audio tone pattern
             * activated. Display shows alarm message and recommended action. */
    }

    action afAlarmInhibitActions : Scenario {
        attribute redefines name = "AF3: Execute Inhibit Actions";
        doc /* Per notification table: inhibit infusion (→ KVO), inhibit
             * square bolus, inhibit patient bolus, stop active bolus.
             * Transition to PAUSED if infusion inhibited. */
    }

    action afAlarmAcknowledge : Scenario {
        attribute redefines name = "AF3: Clinician Acknowledges Alarm";
        doc /* Clinician reviews alarm condition and acknowledges.
             * Audio may be silenced (max 120s). Condition must clear
             * before resume is allowed. */
    }

    connection : Succession connect source ::> afAlarmSensorTrigger to target ::> afAlarmPriorityResolve;
    connection : Succession connect source ::> afAlarmPriorityResolve to target ::> afAlarmVisualAudio;
    connection : Succession connect source ::> afAlarmPriorityResolve to target ::> afAlarmInhibitActions;
    connection : Succession connect source ::> afAlarmVisualAudio to target ::> afAlarmAcknowledge;

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION FLOW 4: Prescription Configuration & Validation
    // enter data → retrieve safe values → validate → save/reject
    // ═══════════════════════════════════════════════════════════════════════

    action afConfigAuthenticate : Scenario {
        attribute redefines name = "AF4: Clinician Authenticates";
        doc /* Clinician scans badge or enters PIN to access configuration. */
    }

    action afConfigScanDrug : Scenario {
        attribute redefines name = "AF4: Scan Drug Barcode/RFID";
        doc /* Clinician scans drug reservoir barcode. System identifies drug
             * name and concentration automatically. */
    }

    action afConfigRetrieveLimits : Scenario {
        attribute redefines name = "AF4: Retrieve Drug Library Limits";
        doc /* System queries pharmacy database for drug-specific soft limits,
             * hard limits, and incompatibility data. Fallback to local cache. */
    }

    action afConfigEnterParams : Scenario {
        attribute redefines name = "AF4: Enter Prescription Parameters";
        doc /* Clinician enters: basal rate, bolus dose, bolus rate, lockout
             * period, max bolus count, VTBI via touchscreen. */
    }

    action afConfigValidate : Scenario {
        attribute redefines name = "AF4: Validate Against Limits";
        doc /* System checks each parameter against hard limits (reject)
             * and soft limits (warn with override option). */
    }

    action afConfigConfirm : Scenario {
        attribute redefines name = "AF4: Display Summary and Confirm";
        doc /* System displays complete prescription summary. Clinician
             * reviews all parameters and confirms to proceed. */
    }

    action afConfigReject : Scenario {
        attribute redefines name = "AF4: Reject — Hard Limit Exceeded";
        doc /* Parameter exceeds hard limit. System rejects with explanation.
             * Clinician must re-enter corrected value. */
    }

    connection : Succession connect source ::> afConfigAuthenticate to target ::> afConfigScanDrug;
    connection : Succession connect source ::> afConfigScanDrug to target ::> afConfigRetrieveLimits;
    connection : Succession connect source ::> afConfigRetrieveLimits to target ::> afConfigEnterParams;
    connection : Succession connect source ::> afConfigEnterParams to target ::> afConfigValidate;
    connection : Succession connect source ::> afConfigValidate to target ::> afConfigConfirm;
    connection : Succession connect source ::> afConfigValidate to target ::> afConfigReject;
    connection : Succession connect source ::> afConfigReject to target ::> afConfigEnterParams;

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION FLOW 5: Emergency Shutdown
    // critical alarm → inhibit all → KVO delivery → clinician notification → manual resume
    // ═══════════════════════════════════════════════════════════════════════

    action afEmergCriticalAlarm : Scenario {
        attribute redefines name = "AF5: Critical Safety Alarm Triggered";
        doc /* Critical condition detected: air-in-line, valve failure,
             * watchdog timeout, or over-infusion beyond limit. */
    }

    action afEmergInhibitAll : Scenario {
        attribute redefines name = "AF5: Inhibit All Infusion";
        doc /* Immediately stop all drug delivery. Close flow control valve.
             * Stop motor. Cancel any active bolus. */
    }

    action afEmergKVO : Scenario {
        attribute redefines name = "AF5: Activate KVO if Safe";
        doc /* If condition allows (not air-in-line or valve failure),
             * activate KVO rate to maintain venous access. */
    }

    action afEmergNotify : Scenario {
        attribute redefines name = "AF5: Maximum Priority Notification";
        doc /* Red LED. Continuous high-priority audio. Display shows
             * emergency condition and required clinician action.
             * Cannot be silenced. */
    }

    action afEmergClinicianAssess : Scenario {
        attribute redefines name = "AF5: Clinician Assesses Condition";
        doc /* Clinician arrives, assesses the situation. May need to
             * replace tubing, reservoir, or the entire pump. */
    }

    action afEmergResolve : Scenario {
        attribute redefines name = "AF5: Resolve and Resume or Replace";
        doc /* If resolvable: clinician clears condition, acknowledges,
             * and manually resumes infusion. If not: replace pump. */
    }

    connection : Succession connect source ::> afEmergCriticalAlarm to target ::> afEmergInhibitAll;
    connection : Succession connect source ::> afEmergInhibitAll to target ::> afEmergKVO;
    connection : Succession connect source ::> afEmergInhibitAll to target ::> afEmergNotify;
    connection : Succession connect source ::> afEmergNotify to target ::> afEmergClinicianAssess;
    connection : Succession connect source ::> afEmergClinicianAssess to target ::> afEmergResolve;

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION FLOW 6: Power-On Self Test
    // ═══════════════════════════════════════════════════════════════════════

    action afPostPowerOn : Scenario {
        attribute redefines name = "AF6: Power Applied";
        doc /* Power switch activated. Processor boots. */
    }

    action afPostRAMCheck : Scenario {
        attribute redefines name = "AF6: RAM Integrity Check";
        doc /* Write/read pattern test across all RAM regions. */
    }

    action afPostROMCRC : Scenario {
        attribute redefines name = "AF6: ROM CRC Verification";
        doc /* Calculate CRC of firmware image, compare to stored value. */
    }

    action afPostMotorTest : Scenario {
        attribute redefines name = "AF6: Motor Function Test";
        doc /* Run motor briefly, verify position encoder responds. */
    }

    action afPostSensorCal : Scenario {
        attribute redefines name = "AF6: Sensor Calibration Check";
        doc /* Read all sensors at zero-flow, verify within calibration range. */
    }

    action afPostDisplayTest : Scenario {
        attribute redefines name = "AF6: Display Test Pattern";
        doc /* Show test pattern on display, verify via display controller feedback. */
    }

    action afPostCommTest : Scenario {
        attribute redefines name = "AF6: Communication Test";
        doc /* Verify Ethernet link, attempt pharmacy DB connection. */
    }

    action afPostPass : Scenario {
        attribute redefines name = "AF6: POST Pass — Enter IDLE";
        doc /* All tests passed. System enters IDLE state. Ready for use. */
    }

    action afPostFail : Scenario {
        attribute redefines name = "AF6: POST Fail — Block Operation";
        doc /* One or more tests failed. Display error. Block all operation.
             * Require service technician intervention. */
    }

    connection : Succession connect source ::> afPostPowerOn to target ::> afPostRAMCheck;
    connection : Succession connect source ::> afPostRAMCheck to target ::> afPostROMCRC;
    connection : Succession connect source ::> afPostROMCRC to target ::> afPostMotorTest;
    connection : Succession connect source ::> afPostMotorTest to target ::> afPostSensorCal;
    connection : Succession connect source ::> afPostSensorCal to target ::> afPostDisplayTest;
    connection : Succession connect source ::> afPostDisplayTest to target ::> afPostCommTest;
    connection : Succession connect source ::> afPostCommTest to target ::> afPostPass;
    connection : Succession connect source ::> afPostCommTest to target ::> afPostFail;

    // ═══════════════════════════════════════════════════════════════════════
    // FLOW ITEMS
    // ═══════════════════════════════════════════════════════════════════════

    item def DrugFlowItem :> ExchangeItem {
        attribute redefines name = "Drug Flow Data";
        doc /* Flow rate (mL/hr), cumulative volume (mL), pressure (mmHg). */
    }

    item def NotificationSignal :> ExchangeItem {
        attribute redefines name = "Notification Signal";
        doc /* Alarm code, priority, message, required actions. */
    }

    item def ConfigurationData :> ExchangeItem {
        attribute redefines name = "Configuration Data";
        doc /* Drug name, concentration, rates, doses, limits. */
    }

    item def SensorReading :> ExchangeItem {
        attribute redefines name = "Sensor Reading";
        doc /* Flow, pressure, air, temperature, door, reservoir level. */
    }

    item def MotorCommand :> ExchangeItem {
        attribute redefines name = "Motor Command";
        doc /* Motor speed, direction, enable/disable. */
    }
}
