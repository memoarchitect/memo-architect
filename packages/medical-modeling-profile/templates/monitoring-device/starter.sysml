// ============================================================================
// MEMO Medical — Monitoring / Diagnostic Device Starter Template
// CoSMA-layered elements: purpose | requirements | risk | functional |
//   logical | physical | software | interfaces | verification
//
// Archetype: Patient monitor, ECG/EEG/SpO2, glucose monitor, vital signs
//   monitor, diagnostic imaging accessory, bedside monitor
// ============================================================================

package MonitoringDevice {
    import MEMO_Ontology_MedicalProcess::*;

    // ═══════════════════════════════════════════════════════════════════════
    // PURPOSE LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part clinician : Actor {
        attribute redefines name = "Clinician";
        doc /* Interprets displayed data and responds to alarms. */
    }

    part nurse : Actor {
        attribute redefines name = "Nurse";
        doc /* Primary bedside operator. Attaches sensors and sets alarm thresholds. */
    }

    part patient : Stakeholder {
        attribute redefines name = "Patient";
    }

    action intendedUse : UseCase {
        attribute redefines name = "Intended Use";
        doc /* The device is intended to continuously monitor [parameter] in [patient population] in [clinical setting], and alarm when values are outside clinician-defined limits. */
    }

    action ucSetAlarmLimits : UseCase {
        attribute redefines name = "Set Alarm Limits";
    }

    action ucRespondToAlarm : UseCase {
        attribute redefines name = "Respond to Physiological Alarm";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REQUIREMENTS LAYER
    // ═══════════════════════════════════════════════════════════════════════

    requirement unAccurateMeasurement : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines title = "Accurate Physiological Measurement";
        doc /* Values shall be accurate enough for clinical decision-making. */
    }

    requirement unTimelyAlarm : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines title = "Timely Alarm for Critical Values";
        doc /* Clinicians shall be alerted within defined time when parameters are outside safe limits. */
    }

    requirement unContinuousOperation : Requirement {
        attribute redefines category = RequirementCategory::Stakeholder;
        attribute redefines source = "User";
        attribute redefines title = "Continuous Uninterrupted Operation";
        doc /* The monitor shall operate continuously for the patient's care episode without loss of data. */
    }

    requirement srMeasurementAccuracy : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines title = "Measurement Accuracy per IEC 60601-2-X";
        doc /* Measurement accuracy shall meet applicable IEC 60601-2-X performance standard. */
    }

    requirement srAlarmResponseTime : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines title = "Alarm Generation within 10 seconds";
        doc /* An audible and visual alarm shall be generated within 10 seconds of parameter exceeding limit. */
    }

    requirement srDataContinuity : Requirement {
        attribute redefines category = RequirementCategory::System;
        attribute redefines title = "Data Continuity during Power Interruption";
        doc /* Battery backup shall sustain monitoring for ≥ 30 minutes during power failure. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RISK LAYER — ISO 14971
    // ═══════════════════════════════════════════════════════════════════════

    requirement hazInaccurateMeasurement : Hazard {
        attribute redefines title = "Inaccurate Physiological Measurement";
        doc /* Device reports incorrect value (false low/high) due to sensor fault or interference. */
    }

    requirement hazAlarmFailure : Hazard {
        attribute redefines title = "Failure to Alarm";
        doc /* Device fails to generate alarm when parameter is in critical range. */
    }

    requirement hazAlarmFatigue : Hazard {
        attribute redefines title = "Alarm Fatigue from Excessive False Alarms";
        doc /* High false alarm rate causes staff to ignore or disable alarms. */
    }

    requirement hsDelayedIntervention : HazardousSituation {
        attribute redefines title = "Delayed Clinical Intervention";
        doc /* Clinician responds late due to missed or ignored alarm. */
    }

    requirement harmPatientDeterioration : Harm {
        attribute redefines title = "Patient Deterioration or Death from Delayed Response";
    }

    requirement rcSensorCalibration : RiskControl {
        attribute redefines title = "Factory and User Calibration Procedure";
        doc /* Calibration against traceable reference at manufacture; user calibration protocol provided. */
    }

    requirement rcAlarmAudit : RiskControl {
        attribute redefines title = "Alarm Performance Testing per IEC 60601-1-8";
        doc /* Alarm system validated to IEC 60601-1-8 including false alarm rate limits. */
    }

    requirement rcAlarmPriority : RiskControl {
        attribute redefines title = "Alarm Priority Stratification (High/Medium/Low)";
        doc /* Alarms stratified by clinical urgency; high-priority alarms cannot be silenced for >120s. */
    }

    connection : Mitigates connect control :>> rcSensorCalibration to hazard :>> hazInaccurateMeasurement;
    connection : Mitigates connect control :>> rcAlarmAudit to hazard :>> hazAlarmFailure;
    connection : Mitigates connect control :>> rcAlarmPriority to hazard :>> hazAlarmFatigue;
    connection : Causes connect hazard :>> hazAlarmFailure to hs :>> hsDelayedIntervention;
    connection : Causes connect hazard :>> hazAlarmFatigue to hs :>> hsDelayedIntervention;

    // ═══════════════════════════════════════════════════════════════════════
    // FUNCTIONAL LAYER
    // ═══════════════════════════════════════════════════════════════════════

    action funcAcquire : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Acquire Physiological Signal";
    }

    action funcProcess : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Process and Filter Signal";
    }

    action funcDisplay : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Display Parameter and Trend";
    }

    action funcAlarm : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Generate Alarm";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOGICAL / PHYSICAL LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part monitorSystem : System {
        attribute redefines name = "Patient Monitor System";
    }

    part sensorModule : LogicalComponent {
        attribute redefines name = "Physiological Sensor Module";
    }

    part signalProcessor : LogicalComponent {
        attribute redefines name = "Signal Acquisition and Processing Unit";
    }

    part displayUnit : LogicalComponent {
        attribute redefines name = "Display and Alarm Unit";
    }

    part monitorFirmware : SoftwareComponent {
        attribute redefines name = "Monitor Firmware";
        doc /* IEC 62304 Software Safety Class: TODO (B or C). */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICATION LAYER
    // ═══════════════════════════════════════════════════════════════════════

    part testAccuracy : Test {
        attribute redefines name = "Measurement Accuracy Test";
        doc /* Bench test against certified reference standard. Verify against srMeasurementAccuracy. */
    }

    part testAlarmTiming : Test {
        attribute redefines name = "Alarm Response Time Test";
        doc /* Inject out-of-range signal; measure time to alarm onset. Verify srAlarmResponseTime. */
    }

    part testBatteryBackup : Test {
        attribute redefines name = "Battery Backup Duration Test";
        doc /* Remove AC power; verify continued operation for ≥ 30 minutes. */
    }
}
