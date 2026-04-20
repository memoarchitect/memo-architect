// ============================================================================
// GPCA Infusion Pump — Clinical, Usability, Post-Market & Manufacturing (M88)
// Exercises ontology-medical domains rarely used in existing examples
// ≥8 clinical, ≥8 usability, ≥5 post-market, ≥3 manufacturing elements
// ============================================================================

package GPCA_Clinical {
    import MEMO_Ontology_MedicalProcess::*;
    import GPCA_Requirements::*;
    import GPCA_Risk::*;

    // ═══════════════════════════════════════════════════════════════════════
    // CLINICAL CONTEXT (≥8 elements)
    // ═══════════════════════════════════════════════════════════════════════

    requirement intendedUseGPCA : IntendedUse {
        attribute redefines reqId = "CL-IU-001";
        attribute redefines title = "GPCA Intended Use";
        doc /* The GPCA infusion pump is intended for use in hospital
             * inpatient settings for the controlled delivery of analgesic
             * drugs via patient-controlled analgesia (PCA) protocols
             * under the supervision of trained clinical personnel. */
    }

    requirement indicationAcutePain : IntendedUse {
        attribute redefines reqId = "CL-IND-001";
        attribute redefines title = "Acute Post-Operative Pain Management";
        doc /* Management of moderate to severe acute pain in adult
             * hospital inpatients following surgical procedures requiring
             * opioid analgesia. */
    }

    requirement indicationChronicPain : IntendedUse {
        attribute redefines reqId = "CL-IND-002";
        attribute redefines title = "Chronic Pain Management (Palliative)";
        doc /* Continuous and patient-controlled analgesia for chronic
             * pain in palliative care settings. */
    }

    requirement contraDrugAllergy : Requirement {
        attribute redefines category = RequirementCategory::Constraint;
        attribute redefines reqId = "CL-CI-001";
        attribute redefines title = "Contraindication: Known Drug Allergy";
        doc /* The GPCA pump must not be used to deliver drugs to which
             * the patient has a documented allergic reaction. */
    }

    requirement contraRespiratoryCompromise : Requirement {
        attribute redefines category = RequirementCategory::Constraint;
        attribute redefines reqId = "CL-CI-002";
        attribute redefines title = "Contraindication: Severe Respiratory Compromise";
        doc /* The GPCA pump must not be used for PCA in patients with
             * severe respiratory depression (respiratory rate <8/min)
             * without continuous SpO2 monitoring. */
    }

    requirement contraPediatric : Requirement {
        attribute redefines category = RequirementCategory::Constraint;
        attribute redefines reqId = "CL-CI-003";
        attribute redefines title = "Contraindication: Pediatric Patients Under 7";
        doc /* The GPCA pump patient bolus function must not be used
             * for patients under 7 years of age due to inability to
             * understand self-administration concept. */
    }

    requirement claimFlowAccuracy : ClinicalPerformanceClaim {
        attribute redefines reqId = "CL-PC-001";
        attribute redefines title = "Flow Rate Accuracy ±5%";
        doc /* The GPCA pump delivers drug at the prescribed flow rate
             * within ±5% accuracy across the range 1-999 mL/hr as
             * verified by gravimetric measurement per IEC 60601-2-24. */
    }

    requirement claimBolusLatency : ClinicalPerformanceClaim {
        attribute redefines reqId = "CL-PC-002";
        attribute redefines title = "Bolus Delivery Within 2 Seconds";
        doc /* Upon validated patient bolus request, drug delivery begins
             * within 2 seconds of button press as measured by flow sensor. */
    }

    requirement claimSafety : ClinicalSafetyClaim {
        attribute redefines reqId = "CL-SC-001";
        attribute redefines title = "No Lethal Overdose with Controls Active";
        doc /* With all risk controls operational, the probability of a
             * lethal overdose event is less than 10^-6 per hour of operation. */
    }

    part clinicalEvalPlan : ClinicalEvaluationPlan {
        attribute redefines name = "GPCA Clinical Evaluation Plan";
        doc /* Clinical evaluation strategy per MDR Annex XIV/FDA guidance.
             * Includes literature review of PCA pump safety data, bench
             * testing per IEC 60601-2-24, and equivalence analysis with
             * predicate devices. No clinical investigation required (Class II). */
    }

    part clinicalEvalReport : ClinicalEvaluationReport {
        attribute redefines name = "GPCA Clinical Evaluation Report";
        doc /* Summary of clinical evidence supporting safety and performance
             * claims. Literature review of 50+ publications on PCA pump safety.
             * Bench test results demonstrating compliance with IEC 60601-2-24. */
    }

    part clinicalBenefitPainRelief : ClinicalBenefit {
        attribute redefines name = "Effective Patient-Controlled Pain Relief";
        doc /* PCA delivery provides superior pain control compared to
             * nurse-administered PRN analgesia, with 30% faster pain
             * onset and higher patient satisfaction scores. */
    }

    part clinicalBenefitReducedNursingLoad : ClinicalBenefit {
        attribute redefines name = "Reduced Nursing Workload";
        doc /* PCA reduces nursing interventions for pain medication
             * by approximately 60%, allowing staff reallocation. */
    }

    part benefitRiskAssessment : BenefitRiskAssessment {
        attribute redefines name = "GPCA Benefit-Risk Assessment";
        doc /* Overall benefit-risk balance is favorable. Clinical benefits
             * (superior pain control, reduced nursing workload, patient
             * autonomy) outweigh residual risks (which are mitigated to
             * acceptable levels through 32 risk controls). */
    }

    part residualRiskEval : ResidualRiskEvaluation {
        attribute redefines name = "GPCA Residual Risk Evaluation";
        doc /* After implementation of all risk controls, residual risk
             * for each identified hazardous situation is at or below
             * the ALARP threshold per ISO 14971:2019. */
    }

    // Clinical connections
    connection : PlansClinicalEvaluation connect plan ::> clinicalEvalPlan to report ::> clinicalEvalReport;
    connection : SupportsClinicalClaim connect evidence ::> clinicalEvalReport to claim ::> claimFlowAccuracy;
    connection : SupportsClinicalClaim connect evidence ::> clinicalEvalReport to claim ::> claimBolusLatency;
    connection : SupportsClinicalClaim connect evidence ::> clinicalEvalReport to claim ::> claimSafety;
    connection : WeighsAgainstBenefit connect assessment ::> benefitRiskAssessment to benefit ::> clinicalBenefitPainRelief;
    connection : WeighsAgainstBenefit connect assessment ::> benefitRiskAssessment to benefit ::> clinicalBenefitReducedNursingLoad;
    connection : ConcludesBenefitRisk connect assessment ::> benefitRiskAssessment to evaluation ::> residualRiskEval;

    // Anatomical context
    part anatomicalSiteIV : AnatomicalSite {
        attribute redefines name = "Peripheral Venous Access Site";
        doc /* IV catheter insertion site, typically antecubital fossa,
             * dorsum of hand, or forearm vein. */
    }

    part substanceDrug : Substance {
        attribute redefines name = "Analgesic Drug Solution";
        doc /* Opioid analgesic (morphine, fentanyl, hydromorphone)
             * diluted in normal saline at prescribed concentration. */
    }

    part routeIV : RouteOfAdministration {
        attribute redefines name = "Intravenous Infusion";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // USABILITY (≥8 elements)
    // ═══════════════════════════════════════════════════════════════════════

    // User Profiles
    part userProfileNurse : OperationalActor {
        attribute redefines name = "Registered Nurse (Primary Operator)";
        doc /* RN with PCA training. Configures pump, responds to alarms,
             * monitors patient. Typical shift: 12 hours, 4-6 PCA patients. */
    }

    part userProfilePatient : OperationalActor {
        attribute redefines name = "Hospital Inpatient (Bolus Requester)";
        doc /* Adult patient with cognitive ability to understand bolus
             * concept. May be post-surgical, sedated, or in pain.
             * Limited dexterity possible. */
    }

    part userProfileBiomed : OperationalActor {
        attribute redefines name = "Biomedical Technician (Maintainer)";
        doc /* Trained technician for pump maintenance, calibration,
             * and troubleshooting. Accesses service menus. */
    }

    // Use Scenarios
    action useScenarioRoutineInfusion : OperationalScenario {
        attribute redefines name = "Routine Infusion Setup and Monitoring";
        doc /* Nurse configures pump at patient bedside during shift handoff.
             * Scans drug, enters parameters, confirms prescription.
             * Environment: busy ward, multiple interruptions.
             * Hazard: Programming error due to distraction. */
    }

    action useScenarioBolusRequest : OperationalScenario {
        attribute redefines name = "Patient Bolus Self-Administration";
        doc /* Patient in pain presses bolus button for supplemental dose.
             * May be drowsy, confused, or have limited hand strength.
             * Hazard: Repeated pressing during lockout, misunderstanding. */
    }

    action useScenarioAlarmResponse : OperationalScenario {
        attribute redefines name = "Nurse Response to Pump Alarm";
        doc /* Alarm sounds. Nurse is attending another patient. Must
             * identify alarm source, assess priority, take action.
             * Environment: noisy ward, multiple alarm sources.
             * Hazard: Alarm fatigue, delayed response. */
    }

    // Use Errors
    requirement useErrWrongConcentration : UseError {
        attribute redefines reqId = "UE-001";
        attribute redefines title = "Wrong Concentration Entry";
        doc /* Clinician enters 10 mg/mL instead of 1 mg/mL, resulting
             * in 10x dose error. Root cause: confusing decimal point
             * interface, no barcode verification. */
    }

    requirement useErrMissedAlarm : UseError {
        attribute redefines reqId = "UE-002";
        attribute redefines title = "Missed Critical Alarm";
        doc /* Clinician fails to respond to critical alarm within
             * acceptable time. Root cause: alarm fatigue from frequent
             * non-actionable alarms, noisy environment. */
    }

    requirement useErrPrematureDisconnect : UseError {
        attribute redefines reqId = "UE-003";
        attribute redefines title = "Premature Tubing Disconnection";
        doc /* Clinician disconnects tubing from pump before closing
             * clamp, causing potential free flow. Root cause: rushed
             * workflow, lack of procedural interlock. */
    }

    requirement useErrWrongPatient : UseError {
        attribute redefines reqId = "UE-004";
        attribute redefines title = "Pump Connected to Wrong Patient";
        doc /* Nurse connects pre-programmed pump to wrong patient after
             * room transfer. Root cause: no patient-pump verification. */
    }

    // UI Requirements
    requirement uiReqAlarmVisibility : Requirement {
        attribute redefines category = RequirementCategory::Interface;
        attribute redefines domain = "UI";
        attribute redefines reqId = "UI-REQ-001";
        attribute redefines title = "Alarm Visibility from 2 Meters";
        doc /* Visual alarm indicators (LED and display) shall be
             * visible from a minimum distance of 2 meters under
             * typical ward lighting conditions (300-500 lux). */
    }

    requirement uiReqButtonForce : Requirement {
        attribute redefines category = RequirementCategory::Interface;
        attribute redefines domain = "UI";
        attribute redefines reqId = "UI-REQ-002";
        attribute redefines title = "Bolus Button Activation Force <5N";
        doc /* Patient bolus button shall require activation force
             * between 1N and 5N, accommodating patients with reduced
             * hand strength while preventing accidental activation. */
    }

    requirement uiReqDisplayContrast : Requirement {
        attribute redefines category = RequirementCategory::Interface;
        attribute redefines domain = "UI";
        attribute redefines reqId = "UI-REQ-003";
        attribute redefines title = "Display Contrast Ratio ≥7:1";
        doc /* Display shall maintain contrast ratio of at least 7:1
             * for text and critical indicators under all ambient
             * lighting conditions per IEC 60601-1-6. */
    }

    requirement uiReqFontSize : Requirement {
        attribute redefines category = RequirementCategory::Interface;
        attribute redefines domain = "UI";
        attribute redefines reqId = "UI-REQ-004";
        attribute redefines title = "Critical Value Font Size ≥5mm";
        doc /* Flow rate, mode status, and alarm text shall be displayed
             * in a font size of at least 5mm height, readable from
             * 1 meter distance. */
    }

    // Usability evaluation
    part formativeEval : FormativeEvaluation {
        attribute redefines name = "GPCA Formative Usability Evaluation";
        doc /* Iterative usability evaluation with 15 nurses during
             * prototype development. Key findings: decimal point entry
             * confusion resolved by integer-first entry, alarm tone
             * differentiation improved with distinct patterns. */
    }

    part summativeEval : SummativeEvaluation {
        attribute redefines name = "GPCA Summative Usability Evaluation";
        doc /* Final usability validation with 30 representative users
             * (20 nurses, 5 patients, 5 biomed techs). All critical
             * tasks completed successfully. No use errors leading to
             * hazardous situations observed during test. */
    }

    part useSpec : UseSpecification {
        attribute redefines name = "GPCA Use Specification";
        doc /* Defines all user tasks, user profiles, use environments,
             * and acceptance criteria for usability per IEC 62366-1. */
    }

    part useErrorAnalysis : UseErrorAnalysis {
        attribute redefines name = "GPCA Use Error Analysis";
        doc /* Systematic analysis of 4 identified use errors with root
             * cause analysis, risk estimation, and mitigation strategies. */
    }

    // Usability connections
    connection : AnalyzesUseError connect analysis ::> useErrorAnalysis to useError ::> useErrWrongConcentration;
    connection : AnalyzesUseError connect analysis ::> useErrorAnalysis to useError ::> useErrMissedAlarm;
    connection : AnalyzesUseError connect analysis ::> useErrorAnalysis to useError ::> useErrPrematureDisconnect;
    connection : AnalyzesUseError connect analysis ::> useErrorAnalysis to useError ::> useErrWrongPatient;
    connection : ContributesToHazard connect useError ::> useErrWrongConcentration to hazard ::> hazIncorrectConcentration;
    connection : ContributesToHazard connect useError ::> useErrMissedAlarm to hazard ::> hazAlarmFatigue;
    connection : ContributesToHazard connect useError ::> useErrPrematureDisconnect to hazard ::> hazFreeFlow;
    connection : ContributesToHazard connect useError ::> useErrWrongPatient to hazard ::> hazWrongPatient;
    connection : AddressesUseError connect uiRequirement ::> uiReqAlarmVisibility to useError ::> useErrMissedAlarm;
    connection : AddressesUseError connect uiRequirement ::> uiReqButtonForce to useError ::> useErrPrematureDisconnect;
    connection : SpecifiesScenario connect specification ::> useSpec to scenario ::> useScenarioRoutineInfusion;
    connection : SpecifiesScenario connect specification ::> useSpec to scenario ::> useScenarioBolusRequest;
    connection : SpecifiesScenario connect specification ::> useSpec to scenario ::> useScenarioAlarmResponse;
    connection : ExposesUseError connect scenario ::> useScenarioRoutineInfusion to useError ::> useErrWrongConcentration;
    connection : ExposesUseError connect scenario ::> useScenarioBolusRequest to useError ::> useErrWrongPatient;
    connection : ExposesUseError connect scenario ::> useScenarioAlarmResponse to useError ::> useErrMissedAlarm;

    // ═══════════════════════════════════════════════════════════════════════
    // SAFETY & ESSENTIAL PERFORMANCE (IEC 60601)
    // ═══════════════════════════════════════════════════════════════════════

    requirement pofControlledInfusion : PrimaryOperatingFunction {
        attribute redefines reqId = "POF-001";
        attribute redefines title = "Controlled Drug Infusion Delivery";
        doc /* The primary operating function: deliver drug at prescribed rate
             * via PCA protocol with safety controls. */
    }

    requirement epFlowAccuracy : EssentialPerformance {
        attribute redefines reqId = "EP-001";
        attribute redefines title = "Flow Rate Accuracy";
        doc /* Maintenance of flow rate accuracy within ±5% of prescribed rate
             * is essential performance — loss can lead to over/under-dosing. */
    }

    requirement epAlarmFunction : EssentialPerformance {
        attribute redefines reqId = "EP-002";
        attribute redefines title = "Alarm System Function";
        doc /* Reliable alarm detection and notification is essential performance —
             * loss can prevent clinician awareness of critical conditions. */
    }

    requirement epBolusControl : EssentialPerformance {
        attribute redefines reqId = "EP-003";
        attribute redefines title = "Bolus Dose Control";
        doc /* Accurate bolus dose delivery with lockout enforcement is
             * essential performance — loss can lead to overdose. */
    }

    requirement lossFlowAccuracy : EssentialPerformanceLossCondition {
        attribute redefines reqId = "EPC-001";
        attribute redefines title = "Loss of Flow Rate Accuracy";
        doc /* Flow rate deviates beyond ±20% of prescribed rate due to
             * sensor failure, motor malfunction, or control loop instability. */
    }

    requirement lossAlarmFunction : EssentialPerformanceLossCondition {
        attribute redefines reqId = "EPC-002";
        attribute redefines title = "Loss of Alarm System Function";
        doc /* Alarm system fails to detect or notify critical conditions
             * due to sensor failure, software malfunction, or power loss. */
    }

    // Safety connections
    connection : SupportsOperatingFunction connect performance ::> epFlowAccuracy to function ::> pofControlledInfusion;
    connection : SupportsOperatingFunction connect performance ::> epAlarmFunction to function ::> pofControlledInfusion;
    connection : SupportsOperatingFunction connect performance ::> epBolusControl to function ::> pofControlledInfusion;
    connection : DefinesLossCondition connect performance ::> epFlowAccuracy to condition ::> lossFlowAccuracy;
    connection : DefinesLossCondition connect performance ::> epAlarmFunction to condition ::> lossAlarmFunction;
    connection : ProtectsEssentialPerformance connect control ::> rcFlowRateMonitor to performance ::> epFlowAccuracy;
    connection : ProtectsEssentialPerformance connect control ::> rcDualFlowSensor to performance ::> epFlowAccuracy;
    connection : ProtectsEssentialPerformance connect control ::> rcAlarmEscalation to performance ::> epAlarmFunction;
    connection : ProtectsEssentialPerformance connect control ::> rcLockoutEnforcement to performance ::> epBolusControl;
    connection : ProtectsEssentialPerformance connect control ::> rcMaxBolusLimit to performance ::> epBolusControl;

    // ═══════════════════════════════════════════════════════════════════════
    // POST-MARKET (≥5 elements)
    // ═══════════════════════════════════════════════════════════════════════

    part pmsPlan : QMSRecord {
        attribute redefines name = "GPCA Post-Market Surveillance Plan";
        doc /* PMS plan per MDR Article 84 / FDA 21 CFR 803. Defines
             * complaint handling, adverse event reporting thresholds,
             * trend analysis methodology, and periodic safety update
             * report cadence (annual). */
    }

    part adverseEventTemplate : QMSRecord {
        attribute redefines name = "Adverse Event Report Template";
        doc /* Standardized AE report form: device identifier, event date,
             * description, patient outcome, root cause analysis, corrective
             * action taken, regulatory reporting determination. */
    }

    part complaintProcedure : QMSRecord {
        attribute redefines name = "Complaint Handling Procedure";
        doc /* SOPs for receiving, triaging, investigating, and closing
             * customer complaints. Includes reportability assessment
             * per MDR/FDA requirements. */
    }

    part fieldSafetyAction : QMSRecord {
        attribute redefines name = "Field Safety Corrective Action Template";
        doc /* FSCA template for safety-related corrections: affected units,
             * risk assessment, corrective action, implementation timeline,
             * customer communication, regulatory notification. */
    }

    part trendAnalysis : QMSRecord {
        attribute redefines name = "Post-Market Trend Analysis";
        doc /* Quarterly analysis of complaint data, adverse events, and
             * service records. Statistical trend detection for early
             * warning of systematic issues. Triggers CAPA if thresholds
             * exceeded. */
    }

    part postMarketSignal : ProductionPostProductionSignal {
        attribute redefines name = "Post-Market Signal: Alarm Fatigue Reports";
        doc /* Signal identified from post-market surveillance: 12% of
             * complaint reports cite excessive non-actionable alarms.
             * Action: Update alarm threshold algorithm in next firmware
             * release to reduce nuisance alarms by 40%. */
    }

    connection : MonitorsRiskSubject connect signal ::> postMarketSignal to subject ::> hazAlarmFatigue;

    // ═══════════════════════════════════════════════════════════════════════
    // MANUFACTURING (≥3 elements)
    // ═══════════════════════════════════════════════════════════════════════

    action mfgAssemblyProcedure : ManufacturingProcedure {
        attribute redefines name = "GPCA Pump Assembly Procedure";
        doc /* Manufacturing assembly procedure: PCB mounting, motor
             * installation, sensor calibration, display integration,
             * enclosure sealing, final QC inspection. Clean room
             * (ISO 7) for fluidics assembly. */
    }

    action mfgCalibrationProcedure : CalibrationProcedure {
        attribute redefines name = "Flow Rate Calibration Procedure";
        doc /* Calibration of flow sensors and pressure sensors using
             * gravimetric reference standard. 5-point calibration across
             * operating range. Calibration data stored in NV memory.
             * Calibration interval: 12 months. */
    }

    part mfgCalibrationRecord : CalibrationRecord {
        attribute redefines name = "Flow Sensor Calibration Record Template";
        doc /* Documents: serial number, calibration date, reference standard
             * ID, 5-point measurements, pass/fail determination, technician
             * signature. Retained per QMS retention policy. */
    }

    part mfgQCRecord : ManufacturingRecord {
        attribute redefines name = "Final QC Inspection Record";
        doc /* End-of-line quality control: POST execution, flow rate
             * accuracy at 3 points, alarm function test, display test,
             * enclosure seal verification, cosmetic inspection. */
    }

    action mfgServiceProcedure : ServiceProcedure {
        attribute redefines name = "GPCA Preventive Maintenance Procedure";
        doc /* Annual preventive maintenance: visual inspection, battery
             * capacity test, flow sensor recalibration, pressure sensor
             * check, firmware update verification, functional test. */
    }

    part mfgServiceReport : ServiceReport {
        attribute redefines name = "Preventive Maintenance Service Report Template";
        doc /* Documents: serial number, service date, tests performed,
             * results, parts replaced, firmware version, next service
             * due date. */
    }

    // Manufacturing connections
    connection : CalibratesSubject connect procedure ::> mfgCalibrationProcedure to subject ::> flowSensorA;
    connection : CalibratesSubject connect procedure ::> mfgCalibrationProcedure to subject ::> flowSensorB;

    // ═══════════════════════════════════════════════════════════════════════
    // QMS & COMPLIANCE
    // ═══════════════════════════════════════════════════════════════════════

    part standardISO14971 : Standard {
        attribute redefines name = "ISO 14971:2019 — Medical Device Risk Management";
    }

    part standardIEC62304 : Standard {
        attribute redefines name = "IEC 62304:2006+A1:2015 — Medical Device Software Lifecycle";
    }

    part standardIEC60601 : Standard {
        attribute redefines name = "IEC 60601-1:2005+A2:2020 — General Requirements for Safety";
    }

    part standardIEC60601_2_24 : Standard {
        attribute redefines name = "IEC 60601-2-24:2012 — Infusion Pumps and Controllers";
    }

    part standardIEC62366 : Standard {
        attribute redefines name = "IEC 62366-1:2015 — Usability Engineering";
    }

    part dhfRecord : DesignHistoryRecord {
        attribute redefines name = "GPCA Design History File";
        doc /* Complete design history file documenting all design inputs,
             * outputs, reviews, verification, and validation activities
             * for the GPCA infusion pump development. */
    }

    part releaseBaseline : ReleaseBaseline {
        attribute redefines name = "GPCA v1.0 Release Baseline";
        doc /* Configuration baseline for initial production release.
             * Includes firmware v1.0.0, hardware rev B, all verified
             * design outputs, and regulatory submission package. */
    }
}
