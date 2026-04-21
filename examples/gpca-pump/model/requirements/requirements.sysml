// ============================================================================
// GPCA Infusion Pump — System Context & Requirements Hierarchy (M84)
// Based on University of Minnesota CriSys GPCA (Generic Patient Controlled
// Analgesia) pump formal requirements (REQ 1–86).
//
// Stakeholders, Intended Use, User Needs (≥10), System Requirements (≥40),
// Software Requirements (≥20), Interfaces (5), Non-behavioral Requirements.
// Full traceability: UserNeed → SystemRequirement → SoftwareRequirement
// ============================================================================

package GPCA_Requirements {
    import MEMO_Ontology_Arch::*;
    import MEMO_Ontology_Process::*;

    // ═══════════════════════════════════════════════════════════════════════
    // STAKEHOLDERS & ACTORS
    // ═══════════════════════════════════════════════════════════════════════

    part patient : Patient {
        attribute redefines name = "Patient";
        doc /* Hospital inpatient receiving analgesic drug delivery via PCA pump. */
    }

    part clinician : Actor {
        attribute redefines name = "Clinician";
        doc /* Physician or nurse who prescribes and configures the infusion. */
    }

    part pharmacist : Actor {
        attribute redefines name = "Hospital Pharmacist";
        doc /* Verifies prescription and drug compatibility via pharmacy database. */
    }

    part biomedTechnician : Stakeholder {
        attribute redefines name = "Biomedical Technician";
        doc /* Responsible for pump maintenance, calibration, and deployment. */
    }

    part regulatoryBody : Stakeholder {
        attribute redefines name = "Regulatory Body (FDA/Notified Body)";
        doc /* Reviews device safety and effectiveness for market clearance. */
    }

    part hospitalIT : Stakeholder {
        attribute redefines name = "Hospital IT Department";
        doc /* Manages network infrastructure and cybersecurity for connected devices. */
    }

    part drugReservoir : EnvironmentElement {
        attribute redefines name = "Drug Reservoir";
        doc /* Removable container holding the analgesic drug solution. */
    }

    part pharmacyDatabase : EnvironmentElement {
        attribute redefines name = "Hospital Pharmacy Database";
        doc /* External system providing drug library, safe dose ranges, and interaction data. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // USE CASES & SCENARIOS
    // ═══════════════════════════════════════════════════════════════════════

    action ucConfigurePrescription : UseCase {
        attribute redefines name = "Configure Prescription";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "User Goal";
    }

    action ucStartInfusion : UseCase {
        attribute redefines name = "Start Infusion";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "User Goal";
    }

    action ucRequestBolus : UseCase {
        attribute redefines name = "Request Patient Bolus";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "User Goal";
    }

    action ucRespondToAlarm : UseCase {
        attribute redefines name = "Respond to Alarm";
        attribute redefines lifecycleStage = "Operation";
        attribute redefines level = "Subfunction";
    }

    action ucPerformMaintenance : UseCase {
        attribute redefines name = "Perform Maintenance";
        attribute redefines lifecycleStage = "Maintenance";
        attribute redefines level = "User Goal";
    }

    action scenarioNormalBasal : Scenario {
        attribute redefines name = "Normal Basal Infusion Delivery";
    }

    action scenarioBolus : Scenario {
        attribute redefines name = "Patient Bolus Request and Delivery";
    }

    action scenarioAlarmResponse : Scenario {
        attribute redefines name = "Critical Alarm Response by Clinician";
    }

    action scenarioEmergencyShutdown : Scenario {
        attribute redefines name = "Emergency Shutdown and KVO Fallback";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // USER NEEDS (≥10)
    // ═══════════════════════════════════════════════════════════════════════

    requirement unSafeDrugDelivery : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-001";
        attribute redefines title = "Safe Drug Delivery";
        doc /* The clinician needs the pump to deliver analgesic drugs safely
             * without risk of overdose or under-dose. */
    }

    requirement unOverdoseProtection : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-002";
        attribute redefines title = "Overdose Protection";
        doc /* The patient needs automatic protection against drug overdose
             * including maximum dose limits and lockout periods. */
    }

    requirement unBolusAdministration : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-003";
        attribute redefines title = "Patient Self-Administration of Bolus";
        doc /* The patient needs the ability to self-administer supplemental
             * bolus doses within clinician-defined safety limits. */
    }

    requirement unExceptionalConditionAlert : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-004";
        attribute redefines title = "Exceptional Condition Alerting";
        doc /* The clinician needs immediate notification of exceptional
             * conditions including air-in-line, occlusion, empty reservoir,
             * and equipment malfunction. */
    }

    requirement unPrescriptionManagement : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-005";
        attribute redefines title = "Prescription Management";
        doc /* The clinician needs to configure drug type, concentration,
             * flow rate, bolus dose, and lockout period from the pump or
             * pharmacy database. */
    }

    requirement unLogging : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-006";
        attribute redefines title = "Infusion Logging";
        doc /* The clinician needs a complete log of all infusion events,
             * alarms, and configuration changes for clinical review. */
    }

    requirement unContinuousDelivery : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-007";
        attribute redefines title = "Continuous Basal Delivery";
        doc /* The patient needs continuous background analgesic delivery
             * at a clinician-prescribed basal rate. */
    }

    requirement unSecureAccess : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-008";
        attribute redefines title = "Secure Access Control";
        doc /* The hospital needs the pump to prevent unauthorized changes
             * to prescription parameters and device configuration. */
    }

    requirement unReliableOperation : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-009";
        attribute redefines title = "Reliable Unattended Operation";
        doc /* The patient needs the pump to operate reliably when the
             * clinician is not present at bedside. */
    }

    requirement unEasyConfiguration : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-010";
        attribute redefines title = "Easy and Error-Free Configuration";
        doc /* The clinician needs an intuitive interface that minimizes
             * programming errors during prescription entry. */
    }

    requirement unPowerResilience : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-011";
        attribute redefines title = "Power Failure Resilience";
        doc /* The patient needs the pump to maintain safe operation
             * during power interruptions with battery backup. */
    }

    requirement unDrugCompatibility : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines reqId = "UN-012";
        attribute redefines title = "Drug Compatibility Verification";
        doc /* The pharmacist needs the pump to validate drug/concentration
             * against the pharmacy database before infusion starts. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SYSTEM REQUIREMENTS — Infusion Mode Control (REQ 1–47)
    // ═══════════════════════════════════════════════════════════════════════

    requirement sysReqPowerOn : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-001";
        attribute redefines title = "System Power On";
        attribute redefines rationale = "GPCA REQ 1: system start initiates self-test";
        doc /* The system shall transition from OFF to ON state upon
             * activation of the power switch, initiating a self-test sequence. */
    }

    requirement sysReqSelfTest : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-002";
        attribute redefines title = "Power-On Self Test";
        attribute redefines rationale = "GPCA REQ 2: self-test verifies hardware integrity";
        doc /* The system shall perform a power-on self-test (POST) that
             * verifies motor, sensors, display, and communication subsystems
             * before entering IDLE state. */
    }

    requirement sysReqIdleState : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-003";
        attribute redefines title = "Idle State Entry";
        attribute redefines rationale = "GPCA REQ 3: system awaits configuration in IDLE";
        doc /* After successful self-test, the system shall enter IDLE state
             * awaiting prescription configuration. */
    }

    requirement sysReqStartInfusion : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-004";
        attribute redefines title = "Infusion Initiation";
        attribute redefines rationale = "GPCA REQ 4: clinician-initiated transition to THERAPY";
        doc /* The system shall transition from IDLE to THERAPY state upon
             * clinician confirmation after valid prescription is loaded. */
    }

    requirement sysReqBasalDelivery : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-005";
        attribute redefines title = "Basal Rate Delivery";
        attribute redefines rationale = "GPCA REQ 5: continuous background infusion";
        doc /* In ACTIVE/BASAL mode, the system shall deliver drug at the
             * prescribed basal rate continuously within ±5% accuracy. */
    }

    requirement sysReqSquareBolus : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-006";
        attribute redefines title = "Clinician Square Bolus";
        attribute redefines rationale = "GPCA REQ 6: clinician-initiated bolus at prescribed rate";
        doc /* The system shall deliver a clinician-initiated square bolus
             * at the prescribed bolus rate for the prescribed duration. */
    }

    requirement sysReqPatientBolus : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-007";
        attribute redefines title = "Patient Bolus Delivery";
        attribute redefines rationale = "GPCA REQ 7: patient self-administration";
        doc /* Upon patient bolus request, the system shall deliver the
             * prescribed patient bolus dose if lockout period has elapsed
             * and maximum bolus count has not been exceeded. */
    }

    requirement sysReqLockoutPeriod : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-008";
        attribute redefines title = "Bolus Lockout Period";
        attribute redefines rationale = "GPCA REQ 8: prevent bolus overdose via timing";
        doc /* The system shall enforce a minimum lockout period between
             * patient bolus deliveries as prescribed by the clinician. */
    }

    requirement sysReqMaxBolusCount : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-009";
        attribute redefines title = "Maximum Bolus Count";
        attribute redefines rationale = "GPCA REQ 9: cumulative bolus limit per time window";
        doc /* The system shall limit the total number of patient bolus
             * doses within a configurable time window. */
    }

    requirement sysReqFlowRateTolerance : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-010";
        attribute redefines title = "Flow Rate Tolerance Monitoring";
        attribute redefines rationale = "GPCA REQ 10: detect deviation from prescribed rate";
        doc /* The system shall continuously monitor actual flow rate and
             * generate an alarm if deviation exceeds ±20% of prescribed rate. */
    }

    requirement sysReqAirDetection : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-011";
        attribute redefines title = "Air-in-Line Detection";
        attribute redefines rationale = "GPCA REQ 11: prevent air embolism";
        doc /* The system shall detect air bubbles in the infusion line
             * using dual ultrasonic sensors and inhibit infusion when
             * cumulative air volume exceeds 50 µL. */
    }

    requirement sysReqOcclusionDetection : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-012";
        attribute redefines title = "Occlusion Detection";
        attribute redefines rationale = "GPCA REQ 12: detect blocked line";
        doc /* The system shall detect upstream and downstream occlusion
             * via pressure monitoring and generate alarm within 30 seconds. */
    }

    requirement sysReqEmptyReservoir : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-013";
        attribute redefines title = "Empty Reservoir Detection";
        attribute redefines rationale = "GPCA REQ 13: prevent air infusion from empty container";
        doc /* The system shall detect when drug reservoir is empty or
             * below minimum volume and transition to KVO delivery. */
    }

    requirement sysReqLowReservoir : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-014";
        attribute redefines title = "Low Reservoir Warning";
        attribute redefines rationale = "GPCA REQ 14: advance warning before empty";
        doc /* The system shall generate a low reservoir warning when
             * remaining volume drops below configurable threshold. */
    }

    requirement sysReqKVODelivery : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-015";
        attribute redefines title = "Keep Vein Open Delivery";
        attribute redefines rationale = "GPCA REQ 15: maintain venous access during pause/alarm";
        doc /* When infusion is inhibited or paused, the system shall
             * deliver at KVO rate (typically 1 mL/hr) to maintain
             * venous access. */
    }

    requirement sysReqInhibitInfusion : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-016";
        attribute redefines title = "Inhibit Infusion on Critical Alarm";
        attribute redefines rationale = "GPCA notification table: Inhibit_Infusion column";
        doc /* The system shall immediately inhibit all infusion delivery
             * upon detection of a critical safety condition (air-in-line,
             * over-infusion, empty reservoir). */
    }

    requirement sysReqInhibitSquareBolus : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-017";
        attribute redefines title = "Inhibit Square Bolus on Safety Event";
        attribute redefines rationale = "GPCA notification table: Inhibit_Square_Bolus column";
        doc /* The system shall inhibit clinician square bolus delivery
             * when safety conditions are active. */
    }

    requirement sysReqInhibitPatientBolus : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-018";
        attribute redefines title = "Inhibit Patient Bolus on Safety Event";
        attribute redefines rationale = "GPCA notification table: Inhibit_Patient_Bolus column";
        doc /* The system shall inhibit patient bolus delivery when safety
             * conditions are active or lockout period has not elapsed. */
    }

    requirement sysReqStopBolus : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-019";
        attribute redefines title = "Stop Active Bolus on Critical Alarm";
        attribute redefines rationale = "GPCA notification table: Stop_Bolus column";
        doc /* The system shall immediately stop any active bolus delivery
             * upon detection of a critical alarm condition. */
    }

    requirement sysReqPauseInfusion : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-020";
        attribute redefines title = "Pause Infusion";
        attribute redefines rationale = "GPCA REQ: clinician-initiated pause";
        doc /* The system shall support clinician-initiated pause of all
             * infusion delivery with automatic transition to KVO rate. */
    }

    requirement sysReqResumeInfusion : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-021";
        attribute redefines title = "Resume Infusion After Pause";
        attribute redefines rationale = "GPCA REQ: resume from PAUSED state";
        doc /* The system shall resume infusion at the previously prescribed
             * rate upon clinician confirmation after pause condition is cleared. */
    }

    requirement sysReqStopInfusion : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-022";
        attribute redefines title = "Stop Infusion";
        attribute redefines rationale = "GPCA REQ: return to IDLE";
        doc /* The system shall stop all infusion delivery and return to
             * IDLE state upon clinician stop command. */
    }

    requirement sysReqAlarmEscalation : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-023";
        attribute redefines title = "Alarm Priority Escalation";
        attribute redefines rationale = "GPCA notification priority resolution";
        doc /* The system shall support three alarm priority levels (low,
             * medium, high) with escalation from medium to high if not
             * acknowledged within configurable timeout. */
    }

    requirement sysReqVisualAlarm : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-024";
        attribute redefines title = "Visual Alarm Indication";
        attribute redefines rationale = "IEC 60601-1-8 alarm signals";
        doc /* The system shall provide visual alarm indication via LED
             * and display with color coding per alarm priority (red=high,
             * yellow=medium, cyan=low). */
    }

    requirement sysReqAudioAlarm : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-025";
        attribute redefines title = "Audio Alarm Signal";
        attribute redefines rationale = "IEC 60601-1-8 alarm signals";
        doc /* The system shall provide audio alarm signals with distinct
             * tonal patterns per priority level, audible from 2 meters. */
    }

    requirement sysReqAlarmSilence : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-026";
        attribute redefines title = "Temporary Alarm Silence";
        attribute redefines rationale = "GPCA REQ: alarm management";
        doc /* The system shall allow temporary silencing of audio alarm
             * for a maximum of 120 seconds; visual indication shall persist. */
    }

    requirement sysReqOverInfusionDetection : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-027";
        attribute redefines title = "Over-Infusion Detection";
        attribute redefines rationale = "GPCA REQ: safety-critical monitoring";
        doc /* The system shall detect when actual delivered volume exceeds
             * prescribed volume by more than 10% and inhibit infusion. */
    }

    requirement sysReqUnderInfusionDetection : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-028";
        attribute redefines title = "Under-Infusion Detection";
        attribute redefines rationale = "GPCA REQ: therapeutic effectiveness";
        doc /* The system shall detect when actual delivered volume is less
             * than 80% of prescribed volume and generate warning alarm. */
    }

    requirement sysReqReverseFlow : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-029";
        attribute redefines title = "Reverse Flow Detection";
        attribute redefines rationale = "GPCA REQ: prevent backflow";
        doc /* The system shall detect reverse flow in the infusion line
             * and inhibit infusion immediately. */
    }

    requirement sysReqAntiFreeFLow : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-030";
        attribute redefines title = "Anti-Free-Flow Protection";
        attribute redefines rationale = "GPCA REQ: gravity-driven free flow prevention";
        doc /* The system shall incorporate an anti-free-flow mechanism
             * that prevents uncontrolled gravity-driven drug delivery
             * when the administration set is removed from the pump. */
    }

    requirement sysReqModeDisplay : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-031";
        attribute redefines title = "Current Mode Display";
        attribute redefines rationale = "GPCA REQ: operator awareness";
        doc /* The system shall continuously display the current operating
             * mode (OFF, IDLE, BASAL, BOLUS, PAUSED, KVO) on the primary display. */
    }

    requirement sysReqDeliveredVolumeDisplay : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-032";
        attribute redefines title = "Delivered Volume Display";
        attribute redefines rationale = "GPCA REQ: delivery monitoring";
        doc /* The system shall display cumulative delivered volume,
             * current flow rate, and remaining reservoir volume. */
    }

    requirement sysReqWatchdog : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-033";
        attribute redefines title = "Software Watchdog Timer";
        attribute redefines rationale = "GPCA REQ: detect software malfunction";
        doc /* The system shall implement a hardware watchdog timer that
             * triggers safe shutdown if software fails to reset within 100ms. */
    }

    requirement sysReqBatteryBackup : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-034";
        attribute redefines title = "Battery Backup Operation";
        attribute redefines rationale = "GPCA REQ: power resilience";
        doc /* The system shall operate on battery backup for a minimum of
             * 4 hours at maximum flow rate upon loss of mains power. */
    }

    requirement sysReqBatteryLowAlarm : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-035";
        attribute redefines title = "Low Battery Alarm";
        attribute redefines rationale = "GPCA REQ: advance warning of power loss";
        doc /* The system shall generate a low battery alarm when remaining
             * battery capacity drops below 30 minutes of operation. */
    }

    requirement sysReqPowerFailSafe : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-036";
        attribute redefines title = "Power Failure Safe State";
        attribute redefines rationale = "GPCA REQ: fail-safe on complete power loss";
        doc /* Upon complete power loss, the system shall close the flow
             * control valve and activate anti-free-flow mechanism. */
    }

    requirement sysReqMotorControl : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-037";
        attribute redefines title = "Pump Motor Control";
        attribute redefines rationale = "GPCA REQ: precise delivery mechanism";
        doc /* The system shall control the peristaltic pump motor using
             * closed-loop feedback to achieve flow rate accuracy within ±5%. */
    }

    requirement sysReqFlowSensorRedundancy : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-038";
        attribute redefines title = "Flow Sensor Redundancy";
        attribute redefines rationale = "GPCA REQ: single fault tolerance";
        doc /* The system shall employ dual flow sensors with cross-validation;
             * disagreement beyond threshold shall trigger sensor alarm. */
    }

    requirement sysReqPressureMonitoring : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-039";
        attribute redefines title = "Line Pressure Monitoring";
        attribute redefines rationale = "GPCA REQ: occlusion and disconnection detection";
        doc /* The system shall continuously monitor infusion line pressure
             * and detect conditions indicating occlusion (high pressure)
             * or disconnection (low pressure). */
    }

    requirement sysReqTemperatureMonitoring : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-040";
        attribute redefines title = "Environmental Temperature Monitoring";
        attribute redefines rationale = "GPCA REQ: operating condition verification";
        doc /* The system shall monitor ambient temperature and generate
             * alarm if outside operating range (10°C to 40°C). */
    }

    requirement sysReqDoorInterlock : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-041";
        attribute redefines title = "Door Open Interlock";
        attribute redefines rationale = "GPCA REQ: prevent operation with open mechanism";
        doc /* The system shall detect when the pump mechanism door is open
             * and inhibit infusion until door is closed and locked. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SYSTEM REQUIREMENTS — Data Configuration (REQ 48–58)
    // ═══════════════════════════════════════════════════════════════════════

    requirement sysReqPrescriptionEntry : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-048";
        attribute redefines title = "Prescription Data Entry";
        attribute redefines rationale = "GPCA REQ 48: manual prescription entry";
        doc /* The system shall allow clinician entry of prescription parameters:
             * drug name, concentration, basal rate, bolus dose, bolus rate,
             * lockout period, maximum bolus count, VTBI. */
    }

    requirement sysReqDrugLibrary : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-049";
        attribute redefines title = "Drug Library Integration";
        attribute redefines rationale = "GPCA REQ 49: pharmacy database lookup";
        doc /* The system shall retrieve drug-specific safe dose ranges,
             * maximum rates, and incompatibility data from the pharmacy database. */
    }

    requirement sysReqSoftLimitCheck : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-050";
        attribute redefines title = "Soft Limit Warning";
        attribute redefines rationale = "GPCA REQ 50: configurable soft limits";
        doc /* The system shall warn the clinician when entered parameters
             * exceed soft limits defined in the drug library with option
             * to override with confirmation. */
    }

    requirement sysReqHardLimitCheck : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-051";
        attribute redefines title = "Hard Limit Enforcement";
        attribute redefines rationale = "GPCA REQ 51: non-overridable safety limits";
        doc /* The system shall reject any parameter entry that exceeds
             * hard limits defined in the drug library with no override option. */
    }

    requirement sysReqConcentrationValidation : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-052";
        attribute redefines title = "Drug Concentration Validation";
        attribute redefines rationale = "GPCA REQ 52: verify correct drug loading";
        doc /* The system shall validate entered drug concentration against
             * the drug library and alert if mismatch detected. */
    }

    requirement sysReqVTBI : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-053";
        attribute redefines title = "Volume To Be Infused";
        attribute redefines rationale = "GPCA REQ 53: total delivery volume";
        doc /* The system shall accept and enforce a Volume To Be Infused
             * (VTBI) parameter, stopping infusion when VTBI is reached. */
    }

    requirement sysReqPrescriptionConfirmation : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-054";
        attribute redefines title = "Prescription Confirmation";
        attribute redefines rationale = "GPCA REQ 54: require explicit clinician confirmation";
        doc /* The system shall require explicit clinician confirmation of
             * all prescription parameters before starting infusion. */
    }

    requirement sysReqPrescriptionDisplay : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-055";
        attribute redefines title = "Prescription Parameter Display";
        attribute redefines rationale = "GPCA REQ 55: review before confirmation";
        doc /* The system shall display all prescription parameters in a
             * summary screen for clinician review before confirmation. */
    }

    requirement sysReqParameterModification : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-056";
        attribute redefines title = "Parameter Modification During Infusion";
        attribute redefines rationale = "GPCA REQ 56: rate titration";
        doc /* The system shall allow modification of basal rate during
             * active infusion with soft/hard limit validation applied. */
    }

    requirement sysReqConfigTimeout : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-057";
        attribute redefines title = "Configuration Timeout";
        attribute redefines rationale = "GPCA REQ 57: abandoned configuration";
        doc /* The system shall return to IDLE state if prescription
             * configuration is not completed within 10 minutes. */
    }

    requirement sysReqBarcodeScan : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-058";
        attribute redefines title = "Barcode/RFID Scanning";
        attribute redefines rationale = "GPCA REQ 58: automated drug identification";
        doc /* The system shall support barcode or RFID scanning of drug
             * reservoir for automated drug identification and concentration entry. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SYSTEM REQUIREMENTS — Logging & Security (REQ 77–82)
    // ═══════════════════════════════════════════════════════════════════════

    requirement sysReqEventLog : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-077";
        attribute redefines title = "Event Logging";
        attribute redefines rationale = "GPCA REQ 77: audit trail";
        doc /* The system shall log all state transitions, alarm events,
             * configuration changes, and delivery data with timestamps. */
    }

    requirement sysReqLogRetention : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-078";
        attribute redefines title = "Log Data Retention";
        attribute redefines rationale = "GPCA REQ 78: regulatory retention requirements";
        doc /* The system shall retain event log data for a minimum of
             * 30 days in non-volatile memory. */
    }

    requirement sysReqLogExport : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-079";
        attribute redefines title = "Log Data Export";
        attribute redefines rationale = "GPCA REQ 79: clinical review";
        doc /* The system shall support export of event log data via
             * USB or network interface in a standard format. */
    }

    requirement sysReqAuthentication : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-080";
        attribute redefines title = "Clinician Authentication";
        attribute redefines rationale = "GPCA REQ 80: access control";
        doc /* The system shall require clinician authentication (badge,
             * PIN, or biometric) before allowing prescription modification. */
    }

    requirement sysReqAccessLevels : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-081";
        attribute redefines title = "Role-Based Access Levels";
        attribute redefines rationale = "GPCA REQ 81: privilege separation";
        doc /* The system shall enforce role-based access: patient (bolus
             * request only), clinician (all operations), biomed (maintenance). */
    }

    requirement sysReqSessionTimeout : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-082";
        attribute redefines title = "Session Timeout";
        attribute redefines rationale = "GPCA REQ 82: automatic lock after inactivity";
        doc /* The system shall automatically lock the configuration
             * interface after 5 minutes of inactivity. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NON-BEHAVIORAL REQUIREMENTS (REQ 83–86)
    // ═══════════════════════════════════════════════════════════════════════

    requirement sysReqDropResistance : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-083";
        attribute redefines title = "Drop Resistance";
        attribute redefines rationale = "GPCA REQ 83: IEC 60601-1 mechanical safety";
        doc /* The system shall withstand a 1-meter drop onto a hard surface
             * without loss of safety function per IEC 60601-1. */
    }

    requirement sysReqWaterproofing : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-084";
        attribute redefines title = "Fluid Ingress Protection";
        attribute redefines rationale = "GPCA REQ 84: IPX4 splash protection";
        doc /* The system enclosure shall meet IPX4 rating for splash
             * protection from all directions. */
    }

    requirement sysReqDataPersistence : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-085";
        attribute redefines title = "Data Persistence on Power Loss";
        attribute redefines rationale = "GPCA REQ 85: non-volatile storage";
        doc /* All prescription parameters, event logs, and configuration
             * data shall be stored in non-volatile memory and preserved
             * across power cycles. */
    }

    requirement sysReqEMCCompliance : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines reqId = "REQ-086";
        attribute redefines title = "EMC Compliance";
        attribute redefines rationale = "GPCA REQ 86: IEC 60601-1-2 EMC";
        doc /* The system shall meet IEC 60601-1-2 electromagnetic
             * compatibility requirements for medical equipment. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SOFTWARE REQUIREMENTS (≥20) — Derived from System Requirements
    // ═══════════════════════════════════════════════════════════════════════

    requirement swReqFlowRateControl : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-001";
        attribute redefines title = "Flow Rate Control Algorithm";
        doc /* The software shall implement a PID control loop for pump
             * motor speed to achieve prescribed flow rate within ±5%
             * with update rate ≥10 Hz. */
    }

    requirement swReqModeStateMachine : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-002";
        attribute redefines title = "Mode State Machine Implementation";
        doc /* The software shall implement the GPCA hierarchical state
             * machine with all 16 transitions and guard conditions,
             * ensuring deterministic state transitions within 10ms. */
    }

    requirement swReqNotificationPriority : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-003";
        attribute redefines title = "Notification Priority Resolution";
        doc /* The software shall resolve concurrent alarm conditions using
             * the GPCA 20-row notification action table, always presenting
             * the highest-priority active alarm. */
    }

    requirement swReqKVOController : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-004";
        attribute redefines title = "KVO Rate Controller";
        doc /* The software shall maintain KVO delivery rate (1 mL/hr default)
             * when normal infusion is inhibited, paused, or VTBI reached. */
    }

    requirement swReqTimerManagement : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-005";
        attribute redefines title = "Timer Management Service";
        doc /* The software shall manage all timing functions: lockout timer,
             * bolus duration, alarm silence timeout, configuration timeout,
             * session timeout, and watchdog reset. */
    }

    requirement swReqAirBubbleAlgorithm : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-006";
        attribute redefines title = "Air Bubble Detection Algorithm";
        doc /* The software shall process dual ultrasonic sensor data to
             * detect air bubbles, accumulate total air volume, and trigger
             * alarm when threshold (50 µL) is exceeded. */
    }

    requirement swReqOcclusionAlgorithm : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-007";
        attribute redefines title = "Occlusion Detection Algorithm";
        doc /* The software shall analyze pressure sensor data to detect
             * upstream/downstream occlusion within 30 seconds using
             * adaptive threshold based on current flow rate. */
    }

    requirement swReqVolumeTracking : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-008";
        attribute redefines title = "Volume Delivered Tracking";
        doc /* The software shall maintain running total of delivered volume
             * with ±2% accuracy using flow sensor integration. */
    }

    requirement swReqBolusScheduler : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-009";
        attribute redefines title = "Bolus Scheduling and Delivery";
        doc /* The software shall manage bolus request queue, lockout
             * enforcement, dose calculation, and transition between basal
             * and bolus delivery modes. */
    }

    requirement swReqPrescriptionValidator : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-010";
        attribute redefines title = "Prescription Parameter Validation";
        doc /* The software shall validate all prescription parameters against
             * hard limits (reject) and soft limits (warn) from the drug
             * library before accepting configuration. */
    }

    requirement swReqAlarmManager : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-011";
        attribute redefines title = "Alarm Management Module";
        doc /* The software shall maintain an alarm queue with priority
             * resolution, escalation timers, acknowledgment tracking,
             * and silence timer management. */
    }

    requirement swReqEventLogger : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-012";
        attribute redefines title = "Event Logging Module";
        doc /* The software shall log events to non-volatile storage with
             * millisecond timestamps, event type, parameters, and user ID
             * in a circular buffer with 30-day minimum retention. */
    }

    requirement swReqDisplayController : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-013";
        attribute redefines title = "Display Controller";
        doc /* The software shall update the display at ≥2 Hz with current
             * mode, flow rate, delivered volume, remaining volume, active
             * alarms, and battery status. */
    }

    requirement swReqPharmacyInterface : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-014";
        attribute redefines title = "Pharmacy Database Interface";
        doc /* The software shall implement HL7/FHIR interface to query
             * drug library data with timeout handling and fallback to
             * local cached drug database. */
    }

    requirement swReqMotorDriver : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-015";
        attribute redefines title = "Motor Driver Interface";
        doc /* The software shall control the stepper motor via PWM with
             * position feedback, stall detection, and emergency stop
             * capability within 50ms. */
    }

    requirement swReqSensorFusion : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-016";
        attribute redefines title = "Sensor Data Fusion";
        doc /* The software shall cross-validate dual flow sensor and dual
             * pressure sensor readings, detecting sensor disagreement
             * within 2 seconds and raising diagnostic alarm. */
    }

    requirement swReqWatchdogService : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-017";
        attribute redefines title = "Watchdog Service";
        doc /* The software shall reset the hardware watchdog timer every
             * 50ms from the main control loop; failure to reset shall
             * trigger hardware safe-shutdown. */
    }

    requirement swReqNVStorage : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-018";
        attribute redefines title = "Non-Volatile Storage Manager";
        doc /* The software shall implement wear-leveled flash storage
             * with CRC integrity checking for prescription data, logs,
             * and configuration parameters. */
    }

    requirement swReqAuthenticationModule : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-019";
        attribute redefines title = "Authentication Module";
        doc /* The software shall implement multi-factor authentication
             * supporting badge reader, PIN entry, and role assignment
             * with session management and timeout. */
    }

    requirement swReqSelfTestRoutine : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-020";
        attribute redefines title = "Power-On Self Test Routine";
        doc /* The software shall execute POST sequence: RAM check, ROM CRC,
             * motor test, sensor calibration, display test, communication
             * test — reporting results and blocking on any failure. */
    }

    requirement swReqEncryption : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-021";
        attribute redefines title = "Data Encryption";
        doc /* The software shall encrypt all network communications using
             * TLS 1.3 and encrypt stored patient data using AES-256. */
    }

    requirement swReqOverInfusionMonitor : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-022";
        attribute redefines title = "Over-Infusion Monitor";
        doc /* The software shall compare delivered volume against prescribed
             * volume in real-time and trigger inhibit when deviation exceeds
             * 10% with ≤1 second detection latency. */
    }

    requirement swReqReverseFlowDetector : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-023";
        attribute redefines title = "Reverse Flow Detector";
        doc /* The software shall detect negative flow rate from sensor data
             * and immediately close the valve and raise critical alarm. */
    }

    requirement swReqBarcodeProcessor : Requirement {
        attribute redefines category = RequirementCategory::Technical;
        attribute redefines source = "Software";
        attribute redefines domain = "Software";
        attribute redefines reqId = "SW-REQ-024";
        attribute redefines title = "Barcode/RFID Processing";
        doc /* The software shall decode barcode/RFID data to extract drug
             * identifier and concentration, cross-referencing with drug
             * library for validation. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERFACES — 5 GPCA System Interfaces
    // ═══════════════════════════════════════════════════════════════════════

    interface def DataEntryInterface :> Interface {
        attribute redefines name = "Data Entry Interface";
        doc /* Clinician data entry interface for prescription configuration.
             * Includes touchscreen, physical buttons, and barcode scanner.
             * Data items: drug name (string), concentration (mg/mL, 0.01-100),
             * basal rate (mL/hr, 0.1-999), bolus dose (mL, 0.1-50),
             * bolus rate (mL/hr, 0.1-999), lockout period (min, 5-60),
             * max bolus count (integer, 1-20), VTBI (mL, 1-9999). */
    }

    interface def BolusRequestInterface :> Interface {
        attribute redefines name = "Bolus Request Interface";
        doc /* Patient bolus request interface via dedicated hardware button.
             * Data items: bolus request signal (boolean), request timestamp
             * (ISO 8601), patient ID (from session). Single-action activation
             * with tactile feedback. */
    }

    interface def DrugFlowInterface :> Interface {
        attribute redefines name = "Drug Flow Interface";
        doc /* Physical interface between pump mechanism and infusion line.
             * Data items: flow rate command (mL/hr, 0-999), actual flow rate
             * (mL/hr, sensor), line pressure (mmHg, 0-500), air volume
             * (µL, cumulative), valve position (open/closed), motor steps
             * (integer, position feedback). */
    }

    interface def NotificationInterface :> Interface {
        attribute redefines name = "Notification Interface";
        doc /* Alarm and status notification interface to clinician.
             * Data items: alarm code (enum), priority (low/medium/high),
             * alarm message (string, max 80 chars), visual signal (LED color),
             * audio signal (tone pattern ID), acknowledgment status (boolean),
             * silence timer remaining (seconds). */
    }

    interface def PharmacyDatabaseInterface :> Interface {
        attribute redefines name = "Pharmacy Database Interface";
        doc /* Network interface to hospital pharmacy database system.
             * Protocol: HL7 FHIR R4 over TLS 1.3.
             * Data items: drug query request (drug ID), drug response
             * (name, concentration range, soft limits, hard limits,
             * incompatibilities, special instructions), connection status
             * (connected/disconnected/timeout). */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRACEABILITY — UserNeed → SystemRequirement → SoftwareRequirement
    // ═══════════════════════════════════════════════════════════════════════

    // UN-001 Safe Drug Delivery → System Requirements
    connection : Derives connect source ::> unSafeDrugDelivery to derived ::> sysReqBasalDelivery;
    connection : Derives connect source ::> unSafeDrugDelivery to derived ::> sysReqFlowRateTolerance;
    connection : Derives connect source ::> unSafeDrugDelivery to derived ::> sysReqMotorControl;
    connection : Derives connect source ::> unSafeDrugDelivery to derived ::> sysReqAntiFreeFLow;

    // UN-002 Overdose Protection → System Requirements
    connection : Derives connect source ::> unOverdoseProtection to derived ::> sysReqLockoutPeriod;
    connection : Derives connect source ::> unOverdoseProtection to derived ::> sysReqMaxBolusCount;
    connection : Derives connect source ::> unOverdoseProtection to derived ::> sysReqHardLimitCheck;
    connection : Derives connect source ::> unOverdoseProtection to derived ::> sysReqOverInfusionDetection;
    connection : Derives connect source ::> unOverdoseProtection to derived ::> sysReqInhibitInfusion;

    // UN-003 Bolus Self-Administration → System Requirements
    connection : Derives connect source ::> unBolusAdministration to derived ::> sysReqPatientBolus;
    connection : Derives connect source ::> unBolusAdministration to derived ::> sysReqLockoutPeriod;
    connection : Derives connect source ::> unBolusAdministration to derived ::> sysReqSquareBolus;

    // UN-004 Exceptional Condition Alerting → System Requirements
    connection : Derives connect source ::> unExceptionalConditionAlert to derived ::> sysReqAirDetection;
    connection : Derives connect source ::> unExceptionalConditionAlert to derived ::> sysReqOcclusionDetection;
    connection : Derives connect source ::> unExceptionalConditionAlert to derived ::> sysReqEmptyReservoir;
    connection : Derives connect source ::> unExceptionalConditionAlert to derived ::> sysReqAlarmEscalation;
    connection : Derives connect source ::> unExceptionalConditionAlert to derived ::> sysReqVisualAlarm;
    connection : Derives connect source ::> unExceptionalConditionAlert to derived ::> sysReqAudioAlarm;

    // UN-005 Prescription Management → System Requirements
    connection : Derives connect source ::> unPrescriptionManagement to derived ::> sysReqPrescriptionEntry;
    connection : Derives connect source ::> unPrescriptionManagement to derived ::> sysReqDrugLibrary;
    connection : Derives connect source ::> unPrescriptionManagement to derived ::> sysReqSoftLimitCheck;
    connection : Derives connect source ::> unPrescriptionManagement to derived ::> sysReqPrescriptionConfirmation;
    connection : Derives connect source ::> unPrescriptionManagement to derived ::> sysReqBarcodeScan;

    // UN-006 Logging → System Requirements
    connection : Derives connect source ::> unLogging to derived ::> sysReqEventLog;
    connection : Derives connect source ::> unLogging to derived ::> sysReqLogRetention;
    connection : Derives connect source ::> unLogging to derived ::> sysReqLogExport;

    // UN-007 Continuous Delivery → System Requirements
    connection : Derives connect source ::> unContinuousDelivery to derived ::> sysReqBasalDelivery;
    connection : Derives connect source ::> unContinuousDelivery to derived ::> sysReqKVODelivery;

    // UN-008 Secure Access → System Requirements
    connection : Derives connect source ::> unSecureAccess to derived ::> sysReqAuthentication;
    connection : Derives connect source ::> unSecureAccess to derived ::> sysReqAccessLevels;
    connection : Derives connect source ::> unSecureAccess to derived ::> sysReqSessionTimeout;

    // UN-009 Reliable Operation → System Requirements
    connection : Derives connect source ::> unReliableOperation to derived ::> sysReqWatchdog;
    connection : Derives connect source ::> unReliableOperation to derived ::> sysReqFlowSensorRedundancy;
    connection : Derives connect source ::> unReliableOperation to derived ::> sysReqSelfTest;

    // UN-010 Easy Configuration → System Requirements
    connection : Derives connect source ::> unEasyConfiguration to derived ::> sysReqPrescriptionDisplay;
    connection : Derives connect source ::> unEasyConfiguration to derived ::> sysReqSoftLimitCheck;
    connection : Derives connect source ::> unEasyConfiguration to derived ::> sysReqConfigTimeout;

    // UN-011 Power Resilience → System Requirements
    connection : Derives connect source ::> unPowerResilience to derived ::> sysReqBatteryBackup;
    connection : Derives connect source ::> unPowerResilience to derived ::> sysReqBatteryLowAlarm;
    connection : Derives connect source ::> unPowerResilience to derived ::> sysReqPowerFailSafe;
    connection : Derives connect source ::> unPowerResilience to derived ::> sysReqDataPersistence;

    // UN-012 Drug Compatibility → System Requirements
    connection : Derives connect source ::> unDrugCompatibility to derived ::> sysReqDrugLibrary;
    connection : Derives connect source ::> unDrugCompatibility to derived ::> sysReqConcentrationValidation;

    // System Requirements → Software Requirements
    connection : Derives connect source ::> sysReqBasalDelivery to derived ::> swReqFlowRateControl;
    connection : Derives connect source ::> sysReqMotorControl to derived ::> swReqMotorDriver;
    connection : Derives connect source ::> sysReqStartInfusion to derived ::> swReqModeStateMachine;
    connection : Derives connect source ::> sysReqPauseInfusion to derived ::> swReqModeStateMachine;
    connection : Derives connect source ::> sysReqResumeInfusion to derived ::> swReqModeStateMachine;
    connection : Derives connect source ::> sysReqAlarmEscalation to derived ::> swReqNotificationPriority;
    connection : Derives connect source ::> sysReqAlarmEscalation to derived ::> swReqAlarmManager;
    connection : Derives connect source ::> sysReqKVODelivery to derived ::> swReqKVOController;
    connection : Derives connect source ::> sysReqLockoutPeriod to derived ::> swReqTimerManagement;
    connection : Derives connect source ::> sysReqLockoutPeriod to derived ::> swReqBolusScheduler;
    connection : Derives connect source ::> sysReqAirDetection to derived ::> swReqAirBubbleAlgorithm;
    connection : Derives connect source ::> sysReqOcclusionDetection to derived ::> swReqOcclusionAlgorithm;
    connection : Derives connect source ::> sysReqEmptyReservoir to derived ::> swReqVolumeTracking;
    connection : Derives connect source ::> sysReqFlowRateTolerance to derived ::> swReqSensorFusion;
    connection : Derives connect source ::> sysReqFlowSensorRedundancy to derived ::> swReqSensorFusion;
    connection : Derives connect source ::> sysReqEventLog to derived ::> swReqEventLogger;
    connection : Derives connect source ::> sysReqLogRetention to derived ::> swReqNVStorage;
    connection : Derives connect source ::> sysReqDataPersistence to derived ::> swReqNVStorage;
    connection : Derives connect source ::> sysReqAuthentication to derived ::> swReqAuthenticationModule;
    connection : Derives connect source ::> sysReqSelfTest to derived ::> swReqSelfTestRoutine;
    connection : Derives connect source ::> sysReqWatchdog to derived ::> swReqWatchdogService;
    connection : Derives connect source ::> sysReqOverInfusionDetection to derived ::> swReqOverInfusionMonitor;
    connection : Derives connect source ::> sysReqReverseFlow to derived ::> swReqReverseFlowDetector;
    connection : Derives connect source ::> sysReqDrugLibrary to derived ::> swReqPharmacyInterface;
    connection : Derives connect source ::> sysReqPrescriptionEntry to derived ::> swReqPrescriptionValidator;
    connection : Derives connect source ::> sysReqHardLimitCheck to derived ::> swReqPrescriptionValidator;
    connection : Derives connect source ::> sysReqModeDisplay to derived ::> swReqDisplayController;
    connection : Derives connect source ::> sysReqDeliveredVolumeDisplay to derived ::> swReqDisplayController;
    connection : Derives connect source ::> sysReqBarcodeScan to derived ::> swReqBarcodeProcessor;
    connection : Derives connect source ::> sysReqPatientBolus to derived ::> swReqBolusScheduler;
    connection : Derives connect source ::> sysReqMaxBolusCount to derived ::> swReqBolusScheduler;
}
