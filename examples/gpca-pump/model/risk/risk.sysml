// ============================================================================
// GPCA Infusion Pump — Risk Management (M85)
// Full ISO 14971 chain: Hazard → HazardousSituation → Harm
// Risk Controls (≥30), FMEA (≥15 failure modes), Fault Tree Analysis
// Based on GPCA notification/safety architecture
// ============================================================================

package GPCA_Risk {
    import MEMO_Ontology_Medical::*;
    import GPCA_Requirements::*;

    // ═══════════════════════════════════════════════════════════════════════
    // HARMS (≥10)
    // ═══════════════════════════════════════════════════════════════════════

    requirement harmDeath : Harm {
        attribute redefines reqId = "HARM-001";
        attribute redefines title = "Patient Death";
        attribute redefines severity = SeverityLevel::Catastrophic;
        doc /* Death due to respiratory depression from opioid overdose
             * or air embolism from undetected air in line. */
    }

    requirement harmRespiratoryDepression : Harm {
        attribute redefines reqId = "HARM-002";
        attribute redefines title = "Respiratory Depression";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Clinically significant respiratory depression from
             * excessive opioid delivery requiring intervention. */
    }

    requirement harmTissueDamage : Harm {
        attribute redefines reqId = "HARM-003";
        attribute redefines title = "Tissue Damage / Extravasation";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Local tissue damage from extravasation due to occlusion
             * or excessive line pressure. */
    }

    requirement harmSepsis : Harm {
        attribute redefines reqId = "HARM-004";
        attribute redefines title = "Sepsis / Infection";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Systemic infection from contaminated drug or compromised
             * sterile barrier due to reservoir leak. */
    }

    requirement harmInadequatePainRelief : Harm {
        attribute redefines reqId = "HARM-005";
        attribute redefines title = "Inadequate Pain Relief";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Prolonged uncontrolled pain from under-infusion or
             * failed bolus delivery causing patient suffering. */
    }

    requirement harmPsychologicalDistress : Harm {
        attribute redefines reqId = "HARM-006";
        attribute redefines title = "Psychological Distress";
        attribute redefines severity = SeverityLevel::Minor;
        doc /* Patient anxiety and distress from repeated false alarms,
             * device malfunction, or loss of confidence in treatment. */
    }

    requirement harmDelayedTreatment : Harm {
        attribute redefines reqId = "HARM-007";
        attribute redefines title = "Delayed Treatment";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Delay in pain management due to pump malfunction requiring
             * replacement or extended troubleshooting. */
    }

    requirement harmAdverseDrugReaction : Harm {
        attribute redefines reqId = "HARM-008";
        attribute redefines title = "Adverse Drug Reaction";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Adverse reaction from wrong drug or wrong concentration
             * delivered due to configuration error. */
    }

    requirement harmInfection : Harm {
        attribute redefines reqId = "HARM-009";
        attribute redefines title = "Local Infection at IV Site";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Local infection at IV insertion site from prolonged
             * vein access due to pump inability to complete therapy. */
    }

    requirement harmNerveDamage : Harm {
        attribute redefines reqId = "HARM-010";
        attribute redefines title = "Nerve Damage";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Peripheral nerve damage from excessive local pressure
             * due to extravasation from high-pressure infusion. */
    }

    requirement harmAirEmbolism : Harm {
        attribute redefines reqId = "HARM-011";
        attribute redefines title = "Air Embolism";
        attribute redefines severity = SeverityLevel::Catastrophic;
        doc /* Venous air embolism from air-in-line reaching the patient
             * causing cardiovascular compromise. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HAZARDS (≥20)
    // ═══════════════════════════════════════════════════════════════════════

    requirement hazOverInfusion : Hazard {
        attribute redefines reqId = "HAZ-001";
        attribute redefines title = "Over-Infusion";
        doc /* Delivery of drug volume or rate exceeding the prescribed amount. */
    }

    requirement hazUnderInfusion : Hazard {
        attribute redefines reqId = "HAZ-002";
        attribute redefines title = "Under-Infusion";
        doc /* Delivery of drug volume or rate below the prescribed amount. */
    }

    requirement hazAirInLine : Hazard {
        attribute redefines reqId = "HAZ-003";
        attribute redefines title = "Air in Line";
        doc /* Presence of air bubbles in the infusion tubing reaching the patient. */
    }

    requirement hazReverseDelivery : Hazard {
        attribute redefines reqId = "HAZ-004";
        attribute redefines title = "Reverse Flow / Backflow";
        doc /* Drug or blood flowing in reverse direction through the infusion line. */
    }

    requirement hazEmptyReservoir : Hazard {
        attribute redefines reqId = "HAZ-005";
        attribute redefines title = "Empty Reservoir Undetected";
        doc /* Continued pumping after reservoir is empty, introducing air into line. */
    }

    requirement hazLowReservoir : Hazard {
        attribute redefines reqId = "HAZ-006";
        attribute redefines title = "Low Reservoir Undetected";
        doc /* Failure to warn about low reservoir before running empty. */
    }

    requirement hazBolusOverdose : Hazard {
        attribute redefines reqId = "HAZ-007";
        attribute redefines title = "Bolus Overdose";
        doc /* Excessive bolus dose delivered due to lockout failure or
             * maximum count bypass. */
    }

    requirement hazConfigurationError : Hazard {
        attribute redefines reqId = "HAZ-008";
        attribute redefines title = "Configuration / Programming Error";
        doc /* Incorrect prescription parameters entered leading to wrong
             * drug, wrong dose, or wrong rate. */
    }

    requirement hazUnauthorizedAccess : Hazard {
        attribute redefines reqId = "HAZ-009";
        attribute redefines title = "Unauthorized Access";
        doc /* Unauthorized modification of prescription parameters or
             * device configuration by non-clinical personnel. */
    }

    requirement hazCommunicationFailure : Hazard {
        attribute redefines reqId = "HAZ-010";
        attribute redefines title = "Communication Failure";
        doc /* Loss of communication with pharmacy database during
             * prescription validation, resulting in unvalidated parameters. */
    }

    requirement hazPowerFailure : Hazard {
        attribute redefines reqId = "HAZ-011";
        attribute redefines title = "Power Failure";
        doc /* Complete loss of electrical power (mains + battery depleted)
             * during active infusion. */
    }

    requirement hazMechanicalOcclusion : Hazard {
        attribute redefines reqId = "HAZ-012";
        attribute redefines title = "Mechanical Occlusion";
        doc /* Physical blockage of infusion line from kink, clamp, or
             * precipitate buildup. */
    }

    requirement hazDrugIncompatibility : Hazard {
        attribute redefines reqId = "HAZ-013";
        attribute redefines title = "Drug Incompatibility";
        doc /* Administration of incompatible drug or concentration not
             * suitable for PCA delivery. */
    }

    requirement hazIncorrectConcentration : Hazard {
        attribute redefines reqId = "HAZ-014";
        attribute redefines title = "Incorrect Drug Concentration";
        doc /* Mismatch between actual drug concentration and programmed
             * concentration leading to dose error. */
    }

    requirement hazSensorDrift : Hazard {
        attribute redefines reqId = "HAZ-015";
        attribute redefines title = "Sensor Drift / Calibration Error";
        doc /* Gradual drift in flow sensor or pressure sensor readings
             * leading to undetected delivery error. */
    }

    requirement hazAlarmFatigue : Hazard {
        attribute redefines reqId = "HAZ-016";
        attribute redefines title = "Alarm Fatigue";
        doc /* Excessive non-actionable alarms leading clinician to ignore
             * or silence critical alarms. */
    }

    requirement hazWrongPatient : Hazard {
        attribute redefines reqId = "HAZ-017";
        attribute redefines title = "Use Error — Wrong Patient";
        doc /* Pump configured for one patient but connected to another. */
    }

    requirement hazWrongDrug : Hazard {
        attribute redefines reqId = "HAZ-018";
        attribute redefines title = "Use Error — Wrong Drug";
        doc /* Incorrect drug loaded into reservoir, not matching programmed drug. */
    }

    requirement hazSoftwareMalfunction : Hazard {
        attribute redefines reqId = "HAZ-019";
        attribute redefines title = "Software Malfunction";
        doc /* Software crash, hang, or incorrect computation leading to
             * loss of infusion control. */
    }

    requirement hazCybersecurityBreach : Hazard {
        attribute redefines reqId = "HAZ-020";
        attribute redefines title = "Cybersecurity Breach";
        doc /* Remote exploitation of network interface to modify pump
             * parameters or disable safety functions. */
    }

    requirement hazFreeFlow : Hazard {
        attribute redefines reqId = "HAZ-021";
        attribute redefines title = "Free Flow";
        doc /* Uncontrolled gravity-driven drug delivery when tubing set
             * is disconnected from pump mechanism. */
    }

    requirement hazValveFailure : Hazard {
        attribute redefines reqId = "HAZ-022";
        attribute redefines title = "Valve Stuck Open";
        doc /* Flow control valve stuck in open position allowing
             * uncontrolled drug delivery. */
    }

    requirement hazBatteryDepletion : Hazard {
        attribute redefines reqId = "HAZ-023";
        attribute redefines title = "Battery Depletion During Infusion";
        doc /* Battery exhaustion during active infusion without adequate
             * warning leading to uncontrolled shutdown. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HAZARDOUS SITUATIONS (≥25)
    // ═══════════════════════════════════════════════════════════════════════

    requirement hsExcessiveDoseClinicianAbsent : HazardousSituation {
        attribute redefines reqId = "HS-001";
        attribute redefines title = "Over-infusion during basal delivery while clinician absent";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsAirEmbolismBasal : HazardousSituation {
        attribute redefines reqId = "HS-002";
        attribute redefines title = "Air embolism during basal delivery undetected due to sensor failure";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsBolusOverdoseLockoutBypass : HazardousSituation {
        attribute redefines reqId = "HS-003";
        attribute redefines title = "Multiple bolus doses delivered due to lockout timer failure";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsWrongDrugWrongPatient : HazardousSituation {
        attribute redefines reqId = "HS-004";
        attribute redefines title = "Wrong drug delivered to wrong patient due to mislabeling";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsOcclusionUndetected : HazardousSituation {
        attribute redefines reqId = "HS-005";
        attribute redefines title = "Prolonged occlusion undetected leading to tissue damage";
        attribute redefines severity = SeverityLevel::Serious;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsFreeFlowTubingRemoval : HazardousSituation {
        attribute redefines reqId = "HS-006";
        attribute redefines title = "Free flow after tubing removal from pump during active infusion";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsPowerLossMidInfusion : HazardousSituation {
        attribute redefines reqId = "HS-007";
        attribute redefines title = "Complete power loss during active infusion without safe shutdown";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsAlarmSilencedCritical : HazardousSituation {
        attribute redefines reqId = "HS-008";
        attribute redefines title = "Critical alarm silenced and not re-escalated while condition persists";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Occasional;
    }

    requirement hsConcentrationMismatch : HazardousSituation {
        attribute redefines reqId = "HS-009";
        attribute redefines title = "10x dose error from concentration mismatch between reservoir and program";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsSoftwareCrashDuringBolus : HazardousSituation {
        attribute redefines reqId = "HS-010";
        attribute redefines title = "Software crash during bolus delivery leaving valve open";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsCyberAttackRateChange : HazardousSituation {
        attribute redefines reqId = "HS-011";
        attribute redefines title = "Remote attacker modifies flow rate via network vulnerability";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsEmptyReservoirContinuedPumping : HazardousSituation {
        attribute redefines reqId = "HS-012";
        attribute redefines title = "Continued pumping after reservoir empty introduces air";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsSensorDriftUndetected : HazardousSituation {
        attribute redefines reqId = "HS-013";
        attribute redefines title = "Gradual sensor drift causes 30% over-delivery over 8-hour shift";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsAlarmFatigueIgnoredOcclusion : HazardousSituation {
        attribute redefines reqId = "HS-014";
        attribute redefines title = "Clinician ignores occlusion alarm due to alarm fatigue";
        attribute redefines severity = SeverityLevel::Serious;
        attribute redefines probability = ProbabilityLevel::Occasional;
    }

    requirement hsUnauthorizedRateIncrease : HazardousSituation {
        attribute redefines reqId = "HS-015";
        attribute redefines title = "Patient or visitor increases flow rate without clinical authorization";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsReverseFlowBloodContamination : HazardousSituation {
        attribute redefines reqId = "HS-016";
        attribute redefines title = "Reverse flow causes blood to contaminate drug reservoir";
        attribute redefines severity = SeverityLevel::Serious;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsPharmacyDBDownInvalidParams : HazardousSituation {
        attribute redefines reqId = "HS-017";
        attribute redefines title = "Pharmacy DB unavailable; clinician enters unsafe parameters manually";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsBatteryDiesNoWarning : HazardousSituation {
        attribute redefines reqId = "HS-018";
        attribute redefines title = "Battery depletes without warning during nighttime infusion";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsWatchdogFailSoftwareHang : HazardousSituation {
        attribute redefines reqId = "HS-019";
        attribute redefines title = "Watchdog timer fails to trigger on software hang";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsValveStuckOpenDuringAlarm : HazardousSituation {
        attribute redefines reqId = "HS-020";
        attribute redefines title = "Flow control valve stuck open during inhibit command";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsDrugPrecipitateInLine : HazardousSituation {
        attribute redefines reqId = "HS-021";
        attribute redefines title = "Drug precipitate blocks line undetected causing under-delivery";
        attribute redefines severity = SeverityLevel::Serious;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsIncorrectConcentrationEntry : HazardousSituation {
        attribute redefines reqId = "HS-022";
        attribute redefines title = "Clinician enters wrong concentration due to confusing UI";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Occasional;
    }

    requirement hsMotorStallUndetected : HazardousSituation {
        attribute redefines reqId = "HS-023";
        attribute redefines title = "Motor stall during delivery goes undetected by software";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsDoorOpenDuringInfusion : HazardousSituation {
        attribute redefines reqId = "HS-024";
        attribute redefines title = "Pump door opened during active infusion without interlock";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Remote;
    }

    requirement hsTemperatureExtremeDeliveryError : HazardousSituation {
        attribute redefines reqId = "HS-025";
        attribute redefines title = "Extreme temperature causes motor speed drift and delivery error";
        attribute redefines severity = SeverityLevel::Serious;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    requirement hsDisplayFailureNoStatus : HazardousSituation {
        attribute redefines reqId = "HS-026";
        attribute redefines title = "Display failure during active infusion with no status visibility";
        attribute redefines severity = SeverityLevel::Serious;
        attribute redefines probability = ProbabilityLevel::Improbable;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RISK CONTROLS (≥30)
    // ═══════════════════════════════════════════════════════════════════════

    requirement rcFlowRateMonitor : RiskControl {
        attribute redefines reqId = "RC-001";
        attribute redefines title = "Flow Rate Tolerance Monitor (±20%)";
        doc /* Continuous monitoring of actual vs prescribed flow rate with
             * automatic inhibit when deviation exceeds ±20%. */
    }

    requirement rcKVOFallback : RiskControl {
        attribute redefines reqId = "RC-002";
        attribute redefines title = "KVO Fallback Delivery";
        doc /* Automatic transition to KVO rate (1 mL/hr) when infusion
             * is inhibited, maintaining venous access. */
    }

    requirement rcDualAirSensor : RiskControl {
        attribute redefines reqId = "RC-003";
        attribute redefines title = "Dual Ultrasonic Air Detection";
        doc /* Two independent ultrasonic sensors for air bubble detection
             * with cross-validation; inhibit infusion at 50 µL cumulative. */
    }

    requirement rcAlarmEscalation : RiskControl {
        attribute redefines reqId = "RC-004";
        attribute redefines title = "Alarm Priority Escalation";
        doc /* Unacknowledged medium-priority alarms escalate to high
             * priority after configurable timeout. Visual always persists. */
    }

    requirement rcLockoutEnforcement : RiskControl {
        attribute redefines reqId = "RC-005";
        attribute redefines title = "Bolus Lockout Period Enforcement";
        doc /* Hardware-backed timer prevents patient bolus delivery before
             * lockout period has elapsed. Non-overridable by patient. */
    }

    requirement rcMaxBolusLimit : RiskControl {
        attribute redefines reqId = "RC-006";
        attribute redefines title = "Maximum Bolus Count Limit";
        doc /* Cumulative bolus counter per time window; exceeding limit
             * inhibits further patient bolus requests. */
    }

    requirement rcPrescriptionValidation : RiskControl {
        attribute redefines reqId = "RC-007";
        attribute redefines title = "Drug Library Prescription Validation";
        doc /* All prescription parameters validated against pharmacy DB
             * hard/soft limits before infusion can start. */
    }

    requirement rcSessionAuthentication : RiskControl {
        attribute redefines reqId = "RC-008";
        attribute redefines title = "Clinician Session Authentication";
        doc /* Multi-factor authentication required for prescription
             * configuration changes. Automatic lockout after timeout. */
    }

    requirement rcAntiFreeFLow : RiskControl {
        attribute redefines reqId = "RC-009";
        attribute redefines title = "Anti-Free-Flow Valve";
        doc /* Mechanical valve that automatically closes when tubing
             * set is removed from pump mechanism. */
    }

    requirement rcHardwareWatchdog : RiskControl {
        attribute redefines reqId = "RC-010";
        attribute redefines title = "Hardware Watchdog Timer";
        doc /* Independent hardware watchdog triggers safe shutdown
             * (valve close + alarm) if software fails to reset in 100ms. */
    }

    requirement rcDualFlowSensor : RiskControl {
        attribute redefines reqId = "RC-011";
        attribute redefines title = "Dual Flow Sensor Cross-Validation";
        doc /* Two independent flow sensors with continuous cross-check;
             * disagreement beyond threshold raises sensor alarm. */
    }

    requirement rcPressureMonitoring : RiskControl {
        attribute redefines reqId = "RC-012";
        attribute redefines title = "Line Pressure Monitoring";
        doc /* Continuous pressure monitoring for occlusion (high) and
             * disconnection (low) detection within 30 seconds. */
    }

    requirement rcBatteryMonitor : RiskControl {
        attribute redefines reqId = "RC-013";
        attribute redefines title = "Battery Level Monitoring";
        doc /* Continuous battery monitoring with low-battery alarm at
             * 30-minute remaining and critical at 10-minute. */
    }

    requirement rcPowerFailValveClose : RiskControl {
        attribute redefines reqId = "RC-014";
        attribute redefines title = "Power-Fail Valve Close";
        doc /* Normally-closed valve design ensures valve closes on
             * complete power loss, preventing uncontrolled delivery. */
    }

    requirement rcConcentrationScan : RiskControl {
        attribute redefines reqId = "RC-015";
        attribute redefines title = "Barcode/RFID Drug Verification";
        doc /* Automated drug identification via barcode/RFID to prevent
             * concentration mismatch and wrong-drug errors. */
    }

    requirement rcHardLimits : RiskControl {
        attribute redefines reqId = "RC-016";
        attribute redefines title = "Non-Overridable Hard Limits";
        doc /* Drug library hard limits that cannot be overridden by any
             * user role, preventing extreme dose entries. */
    }

    requirement rcDoorInterlock : RiskControl {
        attribute redefines reqId = "RC-017";
        attribute redefines title = "Door Open Interlock";
        doc /* Pump mechanism door sensor inhibits infusion when door
             * is open, preventing operation with exposed mechanism. */
    }

    requirement rcSelfTest : RiskControl {
        attribute redefines reqId = "RC-018";
        attribute redefines title = "Power-On Self Test";
        doc /* Comprehensive hardware and software self-test on every
             * power-on; blocks operation on any test failure. */
    }

    requirement rcOverInfusionInhibit : RiskControl {
        attribute redefines reqId = "RC-019";
        attribute redefines title = "Over-Infusion Automatic Inhibit";
        doc /* Real-time comparison of delivered vs prescribed volume;
             * automatic inhibit when >10% over-delivery detected. */
    }

    requirement rcReverseFlowValve : RiskControl {
        attribute redefines reqId = "RC-020";
        attribute redefines title = "Reverse Flow Detection and Valve";
        doc /* One-way valve plus software reverse flow detection;
             * immediate valve close on negative flow detection. */
    }

    requirement rcTLSEncryption : RiskControl {
        attribute redefines reqId = "RC-021";
        attribute redefines title = "TLS 1.3 Network Encryption";
        doc /* All network communications encrypted with TLS 1.3
             * preventing interception and modification of data. */
    }

    requirement rcRoleBasedAccess : RiskControl {
        attribute redefines reqId = "RC-022";
        attribute redefines title = "Role-Based Access Control";
        doc /* Three access roles (patient, clinician, biomed) with
             * privilege separation enforced in software. */
    }

    requirement rcNVDataIntegrity : RiskControl {
        attribute redefines reqId = "RC-023";
        attribute redefines title = "Non-Volatile Storage with CRC";
        doc /* All stored data protected with CRC integrity checks;
             * corrupted data detected on read and reported. */
    }

    requirement rcTemperatureMonitor : RiskControl {
        attribute redefines reqId = "RC-024";
        attribute redefines title = "Ambient Temperature Monitor";
        doc /* Environmental temperature monitoring with alarm when
             * outside 10°C-40°C operating range. */
    }

    requirement rcAlarmSilenceLimit : RiskControl {
        attribute redefines reqId = "RC-025";
        attribute redefines title = "Alarm Silence Time Limit";
        doc /* Audio silence limited to 120 seconds maximum with
             * visual indication always persisting. */
    }

    requirement rcPrescriptionConfirmation : RiskControl {
        attribute redefines reqId = "RC-026";
        attribute redefines title = "Prescription Summary Confirmation";
        doc /* Full prescription summary display requiring explicit
             * clinician confirmation before infusion starts. */
    }

    requirement rcSoftLimitWarning : RiskControl {
        attribute redefines reqId = "RC-027";
        attribute redefines title = "Soft Limit Warning with Override Logging";
        doc /* Soft limit exceeded generates warning; override allowed
             * only with explicit confirmation and logged to audit trail. */
    }

    requirement rcMotorStallDetection : RiskControl {
        attribute redefines reqId = "RC-028";
        attribute redefines title = "Motor Stall Detection";
        doc /* Motor position feedback detects stall condition within
             * 500ms; raises alarm and inhibits infusion. */
    }

    requirement rcConfigTimeout : RiskControl {
        attribute redefines reqId = "RC-029";
        attribute redefines title = "Configuration Timeout";
        doc /* Auto-return to IDLE after 10 minutes of incomplete
             * configuration preventing abandoned partial setup. */
    }

    requirement rcReservoirLevelSensor : RiskControl {
        attribute redefines reqId = "RC-030";
        attribute redefines title = "Reservoir Level Monitoring";
        doc /* Weight or optical level sensor detects low and empty
             * reservoir conditions before air enters line. */
    }

    requirement rcAuditTrail : RiskControl {
        attribute redefines reqId = "RC-031";
        attribute redefines title = "Tamper-Evident Audit Trail";
        doc /* All events, configuration changes, and alarms logged
             * with timestamps in append-only non-volatile storage. */
    }

    requirement rcDisplayRedundancy : RiskControl {
        attribute redefines reqId = "RC-032";
        attribute redefines title = "Display Failure Detection";
        doc /* Display self-test detects failure; LED alarm indicators
             * provide backup status even with display failure. */
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RISK MATRIX — Pre/Post Mitigation Assessment
    // ═══════════════════════════════════════════════════════════════════════

    part riskManagementPlan : RiskManagementPlan {
        attribute redefines name = "GPCA Risk Management Plan";
        doc /* ISO 14971:2019 compliant risk management plan for the
             * GPCA Generic Patient Controlled Analgesia pump system. */
    }

    requirement riskOverInfusionPre : Risk {
        attribute redefines reqId = "RISK-001-PRE";
        attribute redefines title = "Over-Infusion Risk (Pre-Mitigation)";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Occasional;
        attribute redefines riskLevel = "Unacceptable";
    }

    requirement riskOverInfusionPost : Risk {
        attribute redefines reqId = "RISK-001-POST";
        attribute redefines title = "Over-Infusion Risk (Post-Mitigation)";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Improbable;
        attribute redefines riskLevel = "ALARP";
        attribute redefines residualRisk = "Acceptable with monitoring";
    }

    requirement riskAirEmbolismPre : Risk {
        attribute redefines reqId = "RISK-002-PRE";
        attribute redefines title = "Air Embolism Risk (Pre-Mitigation)";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Remote;
        attribute redefines riskLevel = "Unacceptable";
    }

    requirement riskAirEmbolismPost : Risk {
        attribute redefines reqId = "RISK-002-POST";
        attribute redefines title = "Air Embolism Risk (Post-Mitigation)";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Incredible;
        attribute redefines riskLevel = "Acceptable";
        attribute redefines residualRisk = "Acceptable";
    }

    requirement riskBolusOverdosePre : Risk {
        attribute redefines reqId = "RISK-003-PRE";
        attribute redefines title = "Bolus Overdose Risk (Pre-Mitigation)";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Occasional;
        attribute redefines riskLevel = "Unacceptable";
    }

    requirement riskBolusOverdosePost : Risk {
        attribute redefines reqId = "RISK-003-POST";
        attribute redefines title = "Bolus Overdose Risk (Post-Mitigation)";
        attribute redefines severity = SeverityLevel::Catastrophic;
        attribute redefines probability = ProbabilityLevel::Improbable;
        attribute redefines riskLevel = "ALARP";
        attribute redefines residualRisk = "Acceptable with monitoring";
    }

    requirement riskConfigErrorPre : Risk {
        attribute redefines reqId = "RISK-004-PRE";
        attribute redefines title = "Configuration Error Risk (Pre-Mitigation)";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Occasional;
        attribute redefines riskLevel = "Unacceptable";
    }

    requirement riskConfigErrorPost : Risk {
        attribute redefines reqId = "RISK-004-POST";
        attribute redefines title = "Configuration Error Risk (Post-Mitigation)";
        attribute redefines severity = SeverityLevel::Critical;
        attribute redefines probability = ProbabilityLevel::Remote;
        attribute redefines riskLevel = "Acceptable";
        attribute redefines residualRisk = "Acceptable";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HAZARD → HAZARDOUS SITUATION → HARM CHAINS
    // ═══════════════════════════════════════════════════════════════════════

    // Over-infusion chain
    connection : Causes connect hazard ::> hazOverInfusion to situation ::> hsExcessiveDoseClinicianAbsent;
    connection : Causes connect hazard ::> hazOverInfusion to situation ::> hsSensorDriftUndetected;
    connection : LeadsTo connect situation ::> hsExcessiveDoseClinicianAbsent to harm ::> harmRespiratoryDepression;
    connection : LeadsTo connect situation ::> hsExcessiveDoseClinicianAbsent to harm ::> harmDeath;
    connection : LeadsTo connect situation ::> hsSensorDriftUndetected to harm ::> harmRespiratoryDepression;

    // Air-in-line chain
    connection : Causes connect hazard ::> hazAirInLine to situation ::> hsAirEmbolismBasal;
    connection : Causes connect hazard ::> hazEmptyReservoir to situation ::> hsEmptyReservoirContinuedPumping;
    connection : LeadsTo connect situation ::> hsAirEmbolismBasal to harm ::> harmAirEmbolism;
    connection : LeadsTo connect situation ::> hsAirEmbolismBasal to harm ::> harmDeath;
    connection : LeadsTo connect situation ::> hsEmptyReservoirContinuedPumping to harm ::> harmAirEmbolism;

    // Bolus overdose chain
    connection : Causes connect hazard ::> hazBolusOverdose to situation ::> hsBolusOverdoseLockoutBypass;
    connection : LeadsTo connect situation ::> hsBolusOverdoseLockoutBypass to harm ::> harmRespiratoryDepression;
    connection : LeadsTo connect situation ::> hsBolusOverdoseLockoutBypass to harm ::> harmDeath;

    // Configuration error chain
    connection : Causes connect hazard ::> hazConfigurationError to situation ::> hsConcentrationMismatch;
    connection : Causes connect hazard ::> hazConfigurationError to situation ::> hsIncorrectConcentrationEntry;
    connection : Causes connect hazard ::> hazIncorrectConcentration to situation ::> hsConcentrationMismatch;
    connection : LeadsTo connect situation ::> hsConcentrationMismatch to harm ::> harmAdverseDrugReaction;
    connection : LeadsTo connect situation ::> hsConcentrationMismatch to harm ::> harmDeath;
    connection : LeadsTo connect situation ::> hsIncorrectConcentrationEntry to harm ::> harmAdverseDrugReaction;

    // Wrong drug/patient chain
    connection : Causes connect hazard ::> hazWrongDrug to situation ::> hsWrongDrugWrongPatient;
    connection : Causes connect hazard ::> hazWrongPatient to situation ::> hsWrongDrugWrongPatient;
    connection : LeadsTo connect situation ::> hsWrongDrugWrongPatient to harm ::> harmAdverseDrugReaction;
    connection : LeadsTo connect situation ::> hsWrongDrugWrongPatient to harm ::> harmDeath;

    // Mechanical/occlusion chains
    connection : Causes connect hazard ::> hazMechanicalOcclusion to situation ::> hsOcclusionUndetected;
    connection : Causes connect hazard ::> hazMechanicalOcclusion to situation ::> hsDrugPrecipitateInLine;
    connection : LeadsTo connect situation ::> hsOcclusionUndetected to harm ::> harmTissueDamage;
    connection : LeadsTo connect situation ::> hsOcclusionUndetected to harm ::> harmInadequatePainRelief;
    connection : LeadsTo connect situation ::> hsDrugPrecipitateInLine to harm ::> harmInadequatePainRelief;

    // Free flow chain
    connection : Causes connect hazard ::> hazFreeFlow to situation ::> hsFreeFlowTubingRemoval;
    connection : Causes connect hazard ::> hazValveFailure to situation ::> hsValveStuckOpenDuringAlarm;
    connection : LeadsTo connect situation ::> hsFreeFlowTubingRemoval to harm ::> harmDeath;
    connection : LeadsTo connect situation ::> hsValveStuckOpenDuringAlarm to harm ::> harmRespiratoryDepression;

    // Power/software chains
    connection : Causes connect hazard ::> hazPowerFailure to situation ::> hsPowerLossMidInfusion;
    connection : Causes connect hazard ::> hazBatteryDepletion to situation ::> hsBatteryDiesNoWarning;
    connection : Causes connect hazard ::> hazSoftwareMalfunction to situation ::> hsSoftwareCrashDuringBolus;
    connection : Causes connect hazard ::> hazSoftwareMalfunction to situation ::> hsWatchdogFailSoftwareHang;
    connection : LeadsTo connect situation ::> hsPowerLossMidInfusion to harm ::> harmInadequatePainRelief;
    connection : LeadsTo connect situation ::> hsPowerLossMidInfusion to harm ::> harmDelayedTreatment;
    connection : LeadsTo connect situation ::> hsSoftwareCrashDuringBolus to harm ::> harmRespiratoryDepression;
    connection : LeadsTo connect situation ::> hsWatchdogFailSoftwareHang to harm ::> harmDeath;
    connection : LeadsTo connect situation ::> hsBatteryDiesNoWarning to harm ::> harmInadequatePainRelief;

    // Alarm fatigue chain
    connection : Causes connect hazard ::> hazAlarmFatigue to situation ::> hsAlarmSilencedCritical;
    connection : Causes connect hazard ::> hazAlarmFatigue to situation ::> hsAlarmFatigueIgnoredOcclusion;
    connection : LeadsTo connect situation ::> hsAlarmSilencedCritical to harm ::> harmRespiratoryDepression;
    connection : LeadsTo connect situation ::> hsAlarmFatigueIgnoredOcclusion to harm ::> harmTissueDamage;

    // Cybersecurity chain
    connection : Causes connect hazard ::> hazCybersecurityBreach to situation ::> hsCyberAttackRateChange;
    connection : LeadsTo connect situation ::> hsCyberAttackRateChange to harm ::> harmDeath;

    // Unauthorized access chain
    connection : Causes connect hazard ::> hazUnauthorizedAccess to situation ::> hsUnauthorizedRateIncrease;
    connection : LeadsTo connect situation ::> hsUnauthorizedRateIncrease to harm ::> harmRespiratoryDepression;

    // Communication failure chain
    connection : Causes connect hazard ::> hazCommunicationFailure to situation ::> hsPharmacyDBDownInvalidParams;
    connection : LeadsTo connect situation ::> hsPharmacyDBDownInvalidParams to harm ::> harmAdverseDrugReaction;

    // Sensor drift chain
    connection : Causes connect hazard ::> hazSensorDrift to situation ::> hsSensorDriftUndetected;

    // Reverse flow chain
    connection : Causes connect hazard ::> hazReverseDelivery to situation ::> hsReverseFlowBloodContamination;
    connection : LeadsTo connect situation ::> hsReverseFlowBloodContamination to harm ::> harmSepsis;

    // Remaining situation → harm links
    connection : LeadsTo connect situation ::> hsMotorStallUndetected to harm ::> harmInadequatePainRelief;
    connection : LeadsTo connect situation ::> hsDoorOpenDuringInfusion to harm ::> harmDelayedTreatment;
    connection : LeadsTo connect situation ::> hsTemperatureExtremeDeliveryError to harm ::> harmInadequatePainRelief;
    connection : LeadsTo connect situation ::> hsDisplayFailureNoStatus to harm ::> harmPsychologicalDistress;

    // Motor stall and door open hazard causes
    connection : Causes connect hazard ::> hazUnderInfusion to situation ::> hsMotorStallUndetected;
    connection : Causes connect hazard ::> hazLowReservoir to situation ::> hsDoorOpenDuringInfusion;

    // ═══════════════════════════════════════════════════════════════════════
    // RISK CONTROL → HAZARDOUS SITUATION MITIGATION
    // ═══════════════════════════════════════════════════════════════════════

    connection : Mitigates connect control ::> rcFlowRateMonitor to hazard ::> hazOverInfusion;
    connection : Mitigates connect control ::> rcFlowRateMonitor to hazard ::> hazUnderInfusion;
    connection : Mitigates connect control ::> rcKVOFallback to hazard ::> hazUnderInfusion;
    connection : Mitigates connect control ::> rcDualAirSensor to hazard ::> hazAirInLine;
    connection : Mitigates connect control ::> rcAlarmEscalation to hazard ::> hazAlarmFatigue;
    connection : Mitigates connect control ::> rcLockoutEnforcement to hazard ::> hazBolusOverdose;
    connection : Mitigates connect control ::> rcMaxBolusLimit to hazard ::> hazBolusOverdose;
    connection : Mitigates connect control ::> rcPrescriptionValidation to hazard ::> hazConfigurationError;
    connection : Mitigates connect control ::> rcPrescriptionValidation to hazard ::> hazDrugIncompatibility;
    connection : Mitigates connect control ::> rcSessionAuthentication to hazard ::> hazUnauthorizedAccess;
    connection : Mitigates connect control ::> rcAntiFreeFLow to hazard ::> hazFreeFlow;
    connection : Mitigates connect control ::> rcHardwareWatchdog to hazard ::> hazSoftwareMalfunction;
    connection : Mitigates connect control ::> rcDualFlowSensor to hazard ::> hazSensorDrift;
    connection : Mitigates connect control ::> rcPressureMonitoring to hazard ::> hazMechanicalOcclusion;
    connection : Mitigates connect control ::> rcBatteryMonitor to hazard ::> hazBatteryDepletion;
    connection : Mitigates connect control ::> rcPowerFailValveClose to hazard ::> hazPowerFailure;
    connection : Mitigates connect control ::> rcPowerFailValveClose to hazard ::> hazValveFailure;
    connection : Mitigates connect control ::> rcConcentrationScan to hazard ::> hazIncorrectConcentration;
    connection : Mitigates connect control ::> rcConcentrationScan to hazard ::> hazWrongDrug;
    connection : Mitigates connect control ::> rcHardLimits to hazard ::> hazConfigurationError;
    connection : Mitigates connect control ::> rcDoorInterlock to hazard ::> hazFreeFlow;
    connection : Mitigates connect control ::> rcSelfTest to hazard ::> hazSensorDrift;
    connection : Mitigates connect control ::> rcOverInfusionInhibit to hazard ::> hazOverInfusion;
    connection : Mitigates connect control ::> rcReverseFlowValve to hazard ::> hazReverseDelivery;
    connection : Mitigates connect control ::> rcTLSEncryption to hazard ::> hazCybersecurityBreach;
    connection : Mitigates connect control ::> rcRoleBasedAccess to hazard ::> hazUnauthorizedAccess;
    connection : Mitigates connect control ::> rcNVDataIntegrity to hazard ::> hazPowerFailure;
    connection : Mitigates connect control ::> rcTemperatureMonitor to hazard ::> hazSensorDrift;
    connection : Mitigates connect control ::> rcAlarmSilenceLimit to hazard ::> hazAlarmFatigue;
    connection : Mitigates connect control ::> rcPrescriptionConfirmation to hazard ::> hazConfigurationError;
    connection : Mitigates connect control ::> rcSoftLimitWarning to hazard ::> hazConfigurationError;
    connection : Mitigates connect control ::> rcMotorStallDetection to hazard ::> hazUnderInfusion;
    connection : Mitigates connect control ::> rcConfigTimeout to hazard ::> hazConfigurationError;
    connection : Mitigates connect control ::> rcReservoirLevelSensor to hazard ::> hazEmptyReservoir;
    connection : Mitigates connect control ::> rcReservoirLevelSensor to hazard ::> hazLowReservoir;
    connection : Mitigates connect control ::> rcAuditTrail to hazard ::> hazUnauthorizedAccess;
    connection : Mitigates connect control ::> rcDisplayRedundancy to hazard ::> hazSoftwareMalfunction;

    // ═══════════════════════════════════════════════════════════════════════
    // FMEA — Failure Modes & Effects Analysis (≥15 failure modes)
    // ═══════════════════════════════════════════════════════════════════════

    part fmeaGPCA : FailureModesAndEffectsAnalysis {
        attribute redefines name = "GPCA Pump FMEA";
    }

    requirement fmMotorFailure : FailureMode {
        attribute redefines reqId = "FM-001";
        attribute redefines title = "Pump Motor Failure";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Pump motor ceases operation — no drug delivery. */
    }

    requirement fcMotorWinding : FailureCause {
        attribute redefines reqId = "FC-001";
        attribute redefines title = "Motor Winding Degradation";
    }

    requirement feNoDelivery : FailureEffect {
        attribute redefines reqId = "FE-001";
        attribute redefines title = "Complete Loss of Drug Delivery";
    }

    requirement fmSensorMalfunction : FailureMode {
        attribute redefines reqId = "FM-002";
        attribute redefines title = "Flow Sensor Malfunction";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Flow sensor provides erroneous readings. */
    }

    requirement fcSensorAgeing : FailureCause {
        attribute redefines reqId = "FC-002";
        attribute redefines title = "Sensor Component Ageing";
    }

    requirement feUndetectedFlowError : FailureEffect {
        attribute redefines reqId = "FE-002";
        attribute redefines title = "Undetected Flow Rate Deviation";
    }

    requirement fmValveStuckOpen : FailureMode {
        attribute redefines reqId = "FM-003";
        attribute redefines title = "Valve Stuck Open";
        attribute redefines severity = SeverityLevel::Catastrophic;
        doc /* Flow control valve fails to close on command. */
    }

    requirement fcValveMechanicalWear : FailureCause {
        attribute redefines reqId = "FC-003";
        attribute redefines title = "Valve Mechanical Wear";
    }

    requirement feUncontrolledDelivery : FailureEffect {
        attribute redefines reqId = "FE-003";
        attribute redefines title = "Uncontrolled Drug Delivery";
    }

    requirement fmValveStuckClosed : FailureMode {
        attribute redefines reqId = "FM-004";
        attribute redefines title = "Valve Stuck Closed";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Flow control valve fails to open on command. */
    }

    requirement feNoFlowDelivery : FailureEffect {
        attribute redefines reqId = "FE-004";
        attribute redefines title = "No Drug Delivery Despite Command";
    }

    requirement fmBatteryDepletion : FailureMode {
        attribute redefines reqId = "FM-005";
        attribute redefines title = "Battery Rapid Depletion";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Battery capacity drops faster than expected. */
    }

    requirement fcBatteryCellDegradation : FailureCause {
        attribute redefines reqId = "FC-005";
        attribute redefines title = "Battery Cell Degradation";
    }

    requirement fePrematurePowerLoss : FailureEffect {
        attribute redefines reqId = "FE-005";
        attribute redefines title = "Premature Power Loss During Infusion";
    }

    requirement fmDisplayFailure : FailureMode {
        attribute redefines reqId = "FM-006";
        attribute redefines title = "Display Failure";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Display blanks or shows corrupted information. */
    }

    requirement fcDisplayDriver : FailureCause {
        attribute redefines reqId = "FC-006";
        attribute redefines title = "Display Driver IC Failure";
    }

    requirement feLossOfStatusVisibility : FailureEffect {
        attribute redefines reqId = "FE-006";
        attribute redefines title = "Loss of Status Information Visibility";
    }

    requirement fmButtonStuck : FailureMode {
        attribute redefines reqId = "FM-007";
        attribute redefines title = "Bolus Button Stuck Pressed";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Patient bolus button mechanically stuck in pressed state. */
    }

    requirement fcButtonMechanicalFatigue : FailureCause {
        attribute redefines reqId = "FC-007";
        attribute redefines title = "Button Mechanical Fatigue";
    }

    requirement feRepeatedBolusRequests : FailureEffect {
        attribute redefines reqId = "FE-007";
        attribute redefines title = "Repeated Unintended Bolus Requests";
    }

    requirement fmTubingOcclusion : FailureMode {
        attribute redefines reqId = "FM-008";
        attribute redefines title = "Tubing Occlusion (Kink)";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Infusion tubing kinked or compressed. */
    }

    requirement fcTubingPositioning : FailureCause {
        attribute redefines reqId = "FC-008";
        attribute redefines title = "Improper Tubing Routing";
    }

    requirement feReducedDelivery : FailureEffect {
        attribute redefines reqId = "FE-008";
        attribute redefines title = "Reduced or Stopped Drug Delivery";
    }

    requirement fmReservoirLeak : FailureMode {
        attribute redefines reqId = "FM-009";
        attribute redefines title = "Drug Reservoir Leak";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Reservoir seal failure causing drug leakage. */
    }

    requirement fcReservoirSealDegradation : FailureCause {
        attribute redefines reqId = "FC-009";
        attribute redefines title = "Reservoir Seal Material Degradation";
    }

    requirement feDrugLossContamination : FailureEffect {
        attribute redefines reqId = "FE-009";
        attribute redefines title = "Drug Loss and Potential Contamination";
    }

    requirement fmCommTimeout : FailureMode {
        attribute redefines reqId = "FM-010";
        attribute redefines title = "Communication Timeout with Pharmacy DB";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Network timeout prevents drug library validation. */
    }

    requirement fcNetworkCongestion : FailureCause {
        attribute redefines reqId = "FC-010";
        attribute redefines title = "Hospital Network Congestion";
    }

    requirement feUnvalidatedPrescription : FailureEffect {
        attribute redefines reqId = "FE-010";
        attribute redefines title = "Prescription Used Without DB Validation";
    }

    requirement fmWatchdogTimeout : FailureMode {
        attribute redefines reqId = "FM-011";
        attribute redefines title = "Software Watchdog Timeout";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Software fails to service watchdog within deadline. */
    }

    requirement fcSoftwareDeadlock : FailureCause {
        attribute redefines reqId = "FC-011";
        attribute redefines title = "Software Deadlock or Infinite Loop";
    }

    requirement feEmergencyShutdown : FailureEffect {
        attribute redefines reqId = "FE-011";
        attribute redefines title = "Emergency Hardware Shutdown";
    }

    requirement fmAirSensorFailure : FailureMode {
        attribute redefines reqId = "FM-012";
        attribute redefines title = "Air Bubble Sensor Failure";
        attribute redefines severity = SeverityLevel::Catastrophic;
        doc /* Ultrasonic air sensor fails to detect air bubbles. */
    }

    requirement fcUltrasonicTransducerDegradation : FailureCause {
        attribute redefines reqId = "FC-012";
        attribute redefines title = "Ultrasonic Transducer Degradation";
    }

    requirement feUndetectedAirInLine : FailureEffect {
        attribute redefines reqId = "FE-012";
        attribute redefines title = "Undetected Air Reaching Patient";
    }

    requirement fmPressureSensorDrift : FailureMode {
        attribute redefines reqId = "FM-013";
        attribute redefines title = "Pressure Sensor Drift";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Pressure sensor readings drift from true value over time. */
    }

    requirement fcPressureTransducerBias : FailureCause {
        attribute redefines reqId = "FC-013";
        attribute redefines title = "Pressure Transducer Calibration Bias";
    }

    requirement feOcclusionDetectionDelay : FailureEffect {
        attribute redefines reqId = "FE-013";
        attribute redefines title = "Delayed Occlusion Detection";
    }

    requirement fmPCBCorrosion : FailureMode {
        attribute redefines reqId = "FM-014";
        attribute redefines title = "PCB Corrosion from Fluid Ingress";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Fluid penetrating enclosure causing PCB corrosion and electrical failure. */
    }

    requirement fcSealFailure : FailureCause {
        attribute redefines reqId = "FC-014";
        attribute redefines title = "Enclosure Seal Failure";
    }

    requirement feIntermittentElectricalFailure : FailureEffect {
        attribute redefines reqId = "FE-014";
        attribute redefines title = "Intermittent Electrical Failures";
    }

    requirement fmNVMemoryCorruption : FailureMode {
        attribute redefines reqId = "FM-015";
        attribute redefines title = "Non-Volatile Memory Corruption";
        attribute redefines severity = SeverityLevel::Critical;
        doc /* Flash memory data corruption affecting stored configuration or logs. */
    }

    requirement fcFlashWearout : FailureCause {
        attribute redefines reqId = "FC-015";
        attribute redefines title = "Flash Memory Wear-Out";
    }

    requirement feConfigDataLoss : FailureEffect {
        attribute redefines reqId = "FE-015";
        attribute redefines title = "Loss of Configuration or Log Data";
    }

    requirement fmBarcodeReaderFailure : FailureMode {
        attribute redefines reqId = "FM-016";
        attribute redefines title = "Barcode Reader Failure";
        attribute redefines severity = SeverityLevel::Serious;
        doc /* Barcode scanner fails to read or misreads drug identifier. */
    }

    requirement fcOpticalDegradation : FailureCause {
        attribute redefines reqId = "FC-016";
        attribute redefines title = "Optical Component Degradation";
    }

    requirement feManualDrugEntry : FailureEffect {
        attribute redefines reqId = "FE-016";
        attribute redefines title = "Fallback to Manual Drug Entry (Error-Prone)";
    }

    // FMEA Detection Controls
    requirement dcMotorPositionFeedback : DetectionControl {
        attribute redefines reqId = "DC-001";
        attribute redefines title = "Motor Position Encoder Feedback";
    }

    requirement dcDualSensorCrossCheck : DetectionControl {
        attribute redefines reqId = "DC-002";
        attribute redefines title = "Dual Sensor Cross-Validation";
    }

    requirement dcValvePositionSensor : DetectionControl {
        attribute redefines reqId = "DC-003";
        attribute redefines title = "Valve Position Feedback Sensor";
    }

    requirement dcBatteryVoltageMonitor : DetectionControl {
        attribute redefines reqId = "DC-004";
        attribute redefines title = "Battery Voltage Continuous Monitor";
    }

    requirement dcDisplaySelfTest : DetectionControl {
        attribute redefines reqId = "DC-005";
        attribute redefines title = "Display Pixel Self-Test";
    }

    requirement dcButtonDebounce : DetectionControl {
        attribute redefines reqId = "DC-006";
        attribute redefines title = "Button State Debounce Logic";
    }

    requirement dcCRCIntegrityCheck : DetectionControl {
        attribute redefines reqId = "DC-007";
        attribute redefines title = "CRC Integrity Check on Read";
    }

    // FMEA structure connections
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmMotorFailure;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmSensorMalfunction;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmValveStuckOpen;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmValveStuckClosed;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmBatteryDepletion;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmDisplayFailure;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmButtonStuck;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmTubingOcclusion;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmReservoirLeak;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmCommTimeout;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmWatchdogTimeout;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmAirSensorFailure;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmPressureSensorDrift;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmPCBCorrosion;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmNVMemoryCorruption;
    connection : AnalyzesFailureMode connect analysis ::> fmeaGPCA to failureMode ::> fmBarcodeReaderFailure;

    // Failure Mode → Cause → Effect chains
    connection : HasFailureCause connect failureMode ::> fmMotorFailure to cause ::> fcMotorWinding;
    connection : ResultsInFailureEffect connect failureMode ::> fmMotorFailure to effect ::> feNoDelivery;
    connection : HasFailureCause connect failureMode ::> fmSensorMalfunction to cause ::> fcSensorAgeing;
    connection : ResultsInFailureEffect connect failureMode ::> fmSensorMalfunction to effect ::> feUndetectedFlowError;
    connection : HasFailureCause connect failureMode ::> fmValveStuckOpen to cause ::> fcValveMechanicalWear;
    connection : ResultsInFailureEffect connect failureMode ::> fmValveStuckOpen to effect ::> feUncontrolledDelivery;
    connection : HasFailureCause connect failureMode ::> fmValveStuckClosed to cause ::> fcValveMechanicalWear;
    connection : ResultsInFailureEffect connect failureMode ::> fmValveStuckClosed to effect ::> feNoFlowDelivery;
    connection : HasFailureCause connect failureMode ::> fmBatteryDepletion to cause ::> fcBatteryCellDegradation;
    connection : ResultsInFailureEffect connect failureMode ::> fmBatteryDepletion to effect ::> fePrematurePowerLoss;
    connection : HasFailureCause connect failureMode ::> fmDisplayFailure to cause ::> fcDisplayDriver;
    connection : ResultsInFailureEffect connect failureMode ::> fmDisplayFailure to effect ::> feLossOfStatusVisibility;
    connection : HasFailureCause connect failureMode ::> fmButtonStuck to cause ::> fcButtonMechanicalFatigue;
    connection : ResultsInFailureEffect connect failureMode ::> fmButtonStuck to effect ::> feRepeatedBolusRequests;
    connection : HasFailureCause connect failureMode ::> fmTubingOcclusion to cause ::> fcTubingPositioning;
    connection : ResultsInFailureEffect connect failureMode ::> fmTubingOcclusion to effect ::> feReducedDelivery;
    connection : HasFailureCause connect failureMode ::> fmReservoirLeak to cause ::> fcReservoirSealDegradation;
    connection : ResultsInFailureEffect connect failureMode ::> fmReservoirLeak to effect ::> feDrugLossContamination;
    connection : HasFailureCause connect failureMode ::> fmCommTimeout to cause ::> fcNetworkCongestion;
    connection : ResultsInFailureEffect connect failureMode ::> fmCommTimeout to effect ::> feUnvalidatedPrescription;
    connection : HasFailureCause connect failureMode ::> fmWatchdogTimeout to cause ::> fcSoftwareDeadlock;
    connection : ResultsInFailureEffect connect failureMode ::> fmWatchdogTimeout to effect ::> feEmergencyShutdown;
    connection : HasFailureCause connect failureMode ::> fmAirSensorFailure to cause ::> fcUltrasonicTransducerDegradation;
    connection : ResultsInFailureEffect connect failureMode ::> fmAirSensorFailure to effect ::> feUndetectedAirInLine;
    connection : HasFailureCause connect failureMode ::> fmPressureSensorDrift to cause ::> fcPressureTransducerBias;
    connection : ResultsInFailureEffect connect failureMode ::> fmPressureSensorDrift to effect ::> feOcclusionDetectionDelay;
    connection : HasFailureCause connect failureMode ::> fmPCBCorrosion to cause ::> fcSealFailure;
    connection : ResultsInFailureEffect connect failureMode ::> fmPCBCorrosion to effect ::> feIntermittentElectricalFailure;
    connection : HasFailureCause connect failureMode ::> fmNVMemoryCorruption to cause ::> fcFlashWearout;
    connection : ResultsInFailureEffect connect failureMode ::> fmNVMemoryCorruption to effect ::> feConfigDataLoss;
    connection : HasFailureCause connect failureMode ::> fmBarcodeReaderFailure to cause ::> fcOpticalDegradation;
    connection : ResultsInFailureEffect connect failureMode ::> fmBarcodeReaderFailure to effect ::> feManualDrugEntry;

    // FMEA → Hazard escalation
    connection : EscalatesToRisk connect effect ::> feNoDelivery to subject ::> hazUnderInfusion;
    connection : EscalatesToRisk connect effect ::> feUndetectedFlowError to subject ::> hazOverInfusion;
    connection : EscalatesToRisk connect effect ::> feUncontrolledDelivery to subject ::> hazOverInfusion;
    connection : EscalatesToRisk connect effect ::> feNoFlowDelivery to subject ::> hazUnderInfusion;
    connection : EscalatesToRisk connect effect ::> fePrematurePowerLoss to subject ::> hazPowerFailure;
    connection : EscalatesToRisk connect effect ::> feRepeatedBolusRequests to subject ::> hazBolusOverdose;
    connection : EscalatesToRisk connect effect ::> feReducedDelivery to subject ::> hazUnderInfusion;
    connection : EscalatesToRisk connect effect ::> feUndetectedAirInLine to subject ::> hazAirInLine;
    connection : EscalatesToRisk connect effect ::> feOcclusionDetectionDelay to subject ::> hazMechanicalOcclusion;
    connection : EscalatesToRisk connect effect ::> feManualDrugEntry to subject ::> hazConfigurationError;

    // Detection control connections
    connection : DetectsFailureMode connect control ::> dcMotorPositionFeedback to failureMode ::> fmMotorFailure;
    connection : DetectsFailureMode connect control ::> dcDualSensorCrossCheck to failureMode ::> fmSensorMalfunction;
    connection : DetectsFailureMode connect control ::> dcValvePositionSensor to failureMode ::> fmValveStuckOpen;
    connection : DetectsFailureMode connect control ::> dcValvePositionSensor to failureMode ::> fmValveStuckClosed;
    connection : DetectsFailureMode connect control ::> dcBatteryVoltageMonitor to failureMode ::> fmBatteryDepletion;
    connection : DetectsFailureMode connect control ::> dcDisplaySelfTest to failureMode ::> fmDisplayFailure;
    connection : DetectsFailureMode connect control ::> dcButtonDebounce to failureMode ::> fmButtonStuck;
    connection : DetectsFailureMode connect control ::> dcCRCIntegrityCheck to failureMode ::> fmNVMemoryCorruption;

    // ═══════════════════════════════════════════════════════════════════════
    // FAULT TREE ANALYSIS — "Patient Receives Lethal Overdose"
    // ═══════════════════════════════════════════════════════════════════════

    part ftaLethalOverdose : FaultTreeAnalysis {
        attribute redefines name = "FTA — Patient Receives Lethal Overdose";
    }

    requirement teLethalOverdose : TopEvent {
        attribute redefines reqId = "TE-001";
        attribute redefines title = "Patient Receives Lethal Overdose";
    }

    requirement ieExcessiveDrugDelivered : IntermediateEvent {
        attribute redefines reqId = "IE-001";
        attribute redefines title = "Excessive Drug Delivered to Patient";
    }

    requirement ieSafetyInhibitFails : IntermediateEvent {
        attribute redefines reqId = "IE-002";
        attribute redefines title = "Safety Inhibit Mechanism Fails";
    }

    requirement ieOverDeliveryUndetected : IntermediateEvent {
        attribute redefines reqId = "IE-003";
        attribute redefines title = "Over-Delivery Goes Undetected";
    }

    requirement beValveStuckOpen : BasicEvent {
        attribute redefines reqId = "BE-001";
        attribute redefines title = "Flow Control Valve Stuck Open";
    }

    requirement beMotorRunaway : BasicEvent {
        attribute redefines reqId = "BE-002";
        attribute redefines title = "Motor Runaway (Control Loop Failure)";
    }

    requirement beLockoutBypass : BasicEvent {
        attribute redefines reqId = "BE-003";
        attribute redefines title = "Bolus Lockout Timer Bypass";
    }

    requirement beConcentrationMismatch : BasicEvent {
        attribute redefines reqId = "BE-004";
        attribute redefines title = "10x Concentration Mismatch";
    }

    requirement beWatchdogFailure : BasicEvent {
        attribute redefines reqId = "BE-005";
        attribute redefines title = "Hardware Watchdog Fails to Fire";
    }

    requirement beBothFlowSensorsFail : BasicEvent {
        attribute redefines reqId = "BE-006";
        attribute redefines title = "Both Flow Sensors Fail Simultaneously";
    }

    requirement beSoftwareCrash : BasicEvent {
        attribute redefines reqId = "BE-007";
        attribute redefines title = "Software Crash During Delivery";
    }

    requirement beCyberIntrusion : BasicEvent {
        attribute redefines reqId = "BE-008";
        attribute redefines title = "Cyber Intrusion Modifies Rate";
    }

    part gateANDLethalOverdose : FaultTreeGate {
        attribute redefines name = "AND — Excessive Delivery AND Inhibit Fails";
        attribute redefines gateType = FaultTreeGateType::And;
    }

    part gateORExcessiveDelivery : FaultTreeGate {
        attribute redefines name = "OR — Any Excessive Delivery Cause";
        attribute redefines gateType = FaultTreeGateType::Or;
    }

    part gateORInhibitFails : FaultTreeGate {
        attribute redefines name = "OR — Any Inhibit Mechanism Failure";
        attribute redefines gateType = FaultTreeGateType::Or;
    }

    // FTA structure
    connection : DefinesTopEvent connect analysis ::> ftaLethalOverdose to topEvent ::> teLethalOverdose;
    connection : UsesGate connect event ::> teLethalOverdose to gate ::> gateANDLethalOverdose;
    connection : ContributesToEvent connect contributor ::> ieExcessiveDrugDelivered to event ::> teLethalOverdose;
    connection : ContributesToEvent connect contributor ::> ieSafetyInhibitFails to event ::> teLethalOverdose;
    connection : UsesGate connect event ::> ieExcessiveDrugDelivered to gate ::> gateORExcessiveDelivery;
    connection : ContributesToEvent connect contributor ::> beValveStuckOpen to event ::> ieExcessiveDrugDelivered;
    connection : ContributesToEvent connect contributor ::> beMotorRunaway to event ::> ieExcessiveDrugDelivered;
    connection : ContributesToEvent connect contributor ::> beLockoutBypass to event ::> ieExcessiveDrugDelivered;
    connection : ContributesToEvent connect contributor ::> beConcentrationMismatch to event ::> ieExcessiveDrugDelivered;
    connection : ContributesToEvent connect contributor ::> beCyberIntrusion to event ::> ieExcessiveDrugDelivered;
    connection : UsesGate connect event ::> ieSafetyInhibitFails to gate ::> gateORInhibitFails;
    connection : ContributesToEvent connect contributor ::> beWatchdogFailure to event ::> ieSafetyInhibitFails;
    connection : ContributesToEvent connect contributor ::> beBothFlowSensorsFail to event ::> ieSafetyInhibitFails;
    connection : ContributesToEvent connect contributor ::> beSoftwareCrash to event ::> ieSafetyInhibitFails;

    // FTA → Hazardous Situation links
    connection : TriggersHazardousSituation connect event ::> teLethalOverdose to situation ::> hsExcessiveDoseClinicianAbsent;

    // ═══════════════════════════════════════════════════════════════════════
    // OVERALL RESIDUAL RISK
    // ═══════════════════════════════════════════════════════════════════════

    part overallResidualRisk : OverallResidualRiskEvaluation {
        attribute redefines name = "GPCA Overall Residual Risk Evaluation";
        doc /* After implementation of all 32 risk controls, the overall
             * residual risk of the GPCA system is evaluated as acceptable.
             * All catastrophic hazards reduced to Improbable or Incredible
             * probability. Benefit-risk balance favorable for intended
             * population (hospital inpatients requiring PCA analgesia). */
    }

    part riskManagementReport : RiskManagementReport {
        attribute redefines name = "GPCA Risk Management Report";
        doc /* ISO 14971:2019 compliant risk management report documenting
             * 23 identified hazards, 26 hazardous situations, 11 harms,
             * 32 risk controls, 16 FMEA failure modes, and 1 fault tree. */
    }

    connection : ConcludesOverallResidualRisk connect report ::> riskManagementReport to evaluation ::> overallResidualRisk;
    connection : PlansRiskManagement connect plan ::> riskManagementPlan to report ::> riskManagementReport;
}
