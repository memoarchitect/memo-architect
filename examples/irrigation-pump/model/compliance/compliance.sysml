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

    requirement intendedUseIrrigationConsole : IntendedUse {
        attribute redefines title = "Provide controlled irrigation support during arthroscopic procedures";
    }

    requirement indicationArthroscopyIrrigation : IndicationForUse {
        attribute redefines title = "Arthroscopic knee and shoulder procedures requiring controlled irrigation pressure and depletion alarming";
    }

    requirement claimControlledVisualization : ClinicalPerformanceClaim {
        attribute redefines claimId = "CC-IRR-001";
        attribute redefines title = "The system supports clinically effective visualization by maintaining commanded irrigation pressure throughout arthroscopy";
        attribute redefines claimBasis = "Bench verification, usability validation, and published arthroscopy irrigation evidence";
    }

    requirement claimSafeAlarmedContinuity : ClinicalSafetyClaim {
        attribute redefines claimId = "CC-IRR-002";
        attribute redefines title = "The system supports clinically acceptable irrigation continuity through timely depletion alarming and controlled recovery workflow";
        attribute redefines claimBasis = "Risk management, usability validation, and field-service trend review";
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

    requirement cyberReqAuthenticatedAlarmIntegration : AuthenticationRequirement {
        attribute redefines title = "Remote alarm integration shall require authenticated system-to-system sessions";
    }

    requirement cyberReqAuthorizedStatusExchange : AuthorizationRequirement {
        attribute redefines title = "Procedure-status exchange shall only permit authorized perioperative systems to retrieve data";
    }

    requirement cyberReqAuditRemoteEvents : AuditLogRequirement {
        attribute redefines title = "The system shall log remote alarm and procedure-status exchanges for cybersecurity review";
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

    part clinicalEvidenceArthroscopyLiterature : ClinicalEvidenceArtifact {
        attribute redefines recordId = "CE-IRR-001";
        attribute redefines title = "Published arthroscopy irrigation performance evidence summary";
        attribute redefines artifactType = "Clinical literature synthesis";
        attribute redefines sourceKind = "Literature review";
        attribute redefines citation = "Arthroscopy irrigation pressure-control literature summary";
    }

    part clinicalEvidenceFieldExperience : ClinicalEvidenceArtifact {
        attribute redefines recordId = "CE-IRR-002";
        attribute redefines title = "Field experience and complaint-trend evidence for depletion alarming";
        attribute redefines artifactType = "Clinical experience summary";
        attribute redefines sourceKind = "Post-market experience";
        attribute redefines citation = "Complaint trend and service review synthesis";
    }

    part clinicalEvalPlanIrrigationConsole : ClinicalEvaluationPlan {
        attribute redefines recordId = "CEP-IRR-001";
        attribute redefines title = "Irrigation console clinical evaluation plan";
        attribute redefines objective = "Plan the evidence package for visualization support and alarmed continuity claims";
    }

    part clinicalEvalReportIrrigationConsole : ClinicalEvaluationReport {
        attribute redefines recordId = "CER-IRR-001";
        attribute redefines title = "Irrigation console clinical evaluation report";
        attribute redefines conclusion = "Clinical performance and safety claims remain supported for the intended arthroscopy use when verified controls and post-market monitoring remain active.";
    }

    part assetAlarmIntegrationChannel : CyberAsset {
        attribute redefines name = "Alarm integration channel";
        attribute redefines assetType = "Networked interface";
    }

    part assetProcedureStatusChannel : CyberAsset {
        attribute redefines name = "Procedure-status exchange channel";
        attribute redefines assetType = "Clinical data interface";
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

    part threatModelIntegratedORConnectivity : ThreatModel {
        attribute redefines title = "Threat model for integrated perioperative connectivity";
    }

    requirement threatUnauthorizedAlarmSuppression : ThreatScenario {
        attribute redefines threatId = "THR-IRR-001";
        attribute redefines title = "Unauthorized client suppresses or alters remote alarm state";
    }

    requirement threatProcedureStatusDisclosure : ThreatScenario {
        attribute redefines threatId = "THR-IRR-002";
        attribute redefines title = "Unauthorized perioperative system retrieves procedure-status data";
    }

    requirement vulnSharedIntegrationCredential : Vulnerability {
        attribute redefines vulnerabilityId = "VUL-IRR-001";
        attribute redefines title = "Shared integration credential reused across multiple clients";
    }

    requirement vulnWeakAuditCoverage : Vulnerability {
        attribute redefines vulnerabilityId = "VUL-IRR-002";
        attribute redefines title = "Remote interface events are not captured with sufficient audit detail";
    }

    requirement scMutualTlsGateway : SecurityControl {
        attribute redefines rcId = "SC-IRR-001";
        attribute redefines title = "Mutual TLS for remote alarm and status interfaces";
    }

    requirement scRoleScopedApiAccess : SecurityControl {
        attribute redefines rcId = "SC-IRR-002";
        attribute redefines title = "Role-scoped API authorization for perioperative integrations";
    }

    requirement scRemoteAuditTrail : SecurityControl {
        attribute redefines rcId = "SC-IRR-003";
        attribute redefines title = "Tamper-evident audit trail for remote integration events";
    }

    part swPlanIrrigationController : SoftwareDevelopmentPlan {
        attribute redefines title = "Irrigation controller software development plan";
    }

    part swReqSpecIrrigationController : SoftwareWorkProduct {
        attribute redefines title = "Irrigation controller software requirements specification";
    }

    part swArchIrrigationController : SoftwareWorkProduct {
        attribute redefines title = "Irrigation controller software architecture";
    }

    part swDesignPrimeWorkflow : SoftwareWorkProduct {
        attribute redefines title = "Prime workflow and alarm handling detailed design";
    }

    part sbomIrrigationRelease : SBOMArtifact {
        attribute redefines title = "SBOM for integrated irrigation controller release";
    }

    part secureUpdateIrrigationController : SecureUpdateCapability {
        attribute redefines name = "Signed update and integrity validation capability";
    }

    part soupEvalUiFramework : SOUPEvaluation {
        attribute redefines title = "Embedded UI framework SOUP evaluation";
    }

    part dataClassProcedureSummaryPayload : ProtectedHealthInformation {
        attribute redefines name = "Procedure summary payload PHI classification";
        attribute redefines sensitivity = "individually identifiable perioperative status data";
    }

    part dataClassPerioperativeObservation : SpecialCategoryPersonalData {
        attribute redefines name = "Perioperative observation personal-data classification";
        attribute redefines sensitivity = "health-data special category";
    }

    action procProcedureStatusExchange : DataProcessingActivity {
        attribute redefines name = "Process procedure-status exchange";
        attribute redefines purpose = "Transmit clinically necessary procedure status and device state into perioperative documentation systems";
    }

    action procAlarmStatusRelay : DataProcessingActivity {
        attribute redefines name = "Process alarm-status relay";
        attribute redefines purpose = "Relay active alarm state into connected perioperative alarm infrastructure";
    }

    action procQualityAnalyticsExport : DataProcessingActivity {
        attribute redefines name = "Process quality analytics export";
        attribute redefines purpose = "Produce a minimized secondary-use dataset for quality analytics after de-identification or consent-governed export";
    }

    part hospitalControllerRole : DataControllerRole {
        attribute redefines name = "Hospital Provider Organization";
        attribute redefines role = "HIPAA covered entity and GDPR controller";
    }

    part integrationVendorProcessorRole : DataProcessorRole {
        attribute redefines name = "Perioperative Integration Service";
        attribute redefines role = "Business associate and GDPR processor";
    }

    part basisHipaaTreatmentIntegration : HIPAAPermissionBasis {
        attribute redefines basisId = "HIPAA-IRR-001";
        attribute redefines title = "Treatment and health-care operations disclosure basis";
    }

    part basisGdprClinicalCare : LawfulBasis {
        attribute redefines basisId = "GDPR-IRR-001";
        attribute redefines title = "Clinical-care processing lawful basis";
    }

    part basisGdprExplicitConsentAnalytics : LawfulBasis {
        attribute redefines basisId = "GDPR-IRR-002";
        attribute redefines title = "Explicit consent for optional quality analytics export";
    }

    part consentQualityAnalyticsReuse : ConsentRecord {
        attribute redefines recordId = "CONS-IRR-001";
        attribute redefines title = "Optional quality analytics export consent";
        attribute redefines scope = "Secondary analytics use outside direct care";
    }

    part privacyNoticePerioperativeIntegration : PrivacyNotice {
        attribute redefines recordId = "PN-IRR-001";
        attribute redefines title = "Perioperative integration privacy notice";
        attribute redefines noticeScope = "Connected alarm and procedure-status interfaces";
    }

    part retentionPolicyProcedureStatus : DataRetentionPolicy {
        attribute redefines policyId = "RET-IRR-001";
        attribute redefines retentionPeriod = "Audit and procedure-status records retained per perioperative record and quality-system policy";
    }

    part minimumNecessaryProcedureStatus : MinimumNecessaryPolicy {
        attribute redefines policyId = "MIN-IRR-001";
    }

    part deIdentificationAnalyticsExport : DeIdentificationMethod {
        attribute redefines methodName = "Safe-harbor and expert-reviewed de-identification profile for analytics export";
    }

    part pseudonymizationProcedureStatus : PseudonymizationMethod {
        attribute redefines methodName = "Case-token replacement before cross-system analytics export";
    }

    part privacyAssessmentConnectedOR : PrivacyImpactAssessment {
        attribute redefines recordId = "PIA-IRR-001";
        attribute redefines title = "Connected OR privacy impact assessment";
        attribute redefines scope = "Procedure-status exchange, alarm relay, secondary analytics, and terminology-boundary governance";
    }

    part accessRequestProcedureStatusLogs : AccessRequest {
        attribute redefines recordId = "DSR-IRR-001";
        attribute redefines title = "Procedure-status log access request handling";
        attribute redefines requestId = "REQ-IRR-001";
        attribute redefines requestType = "Access";
    }

    part erasureRequestAnalyticsExport : ErasureRequest {
        attribute redefines recordId = "DSR-IRR-002";
        attribute redefines title = "Analytics export erasure workflow anchor";
        attribute redefines requestId = "REQ-IRR-002";
        attribute redefines requestType = "Erasure";
    }

    part terminologyBindingProcedureStatus : TerminologyBinding {
        attribute redefines bindingId = "TB-IRR-001";
        attribute redefines bindingStrength = "required";
    }

    part codeSystemDeviceStatus : ClinicalCodeSystemReference {
        attribute redefines canonicalUri = "https://memo.example/CodeSystem/irrigation-device-status";
        attribute redefines version = "1.0.0";
        attribute redefines title = "Irrigation Device Status Code System";
    }

    part codeSystemLoinc : ClinicalCodeSystemReference {
        attribute redefines canonicalUri = "http://loinc.org";
        attribute redefines version = "2.81";
        attribute redefines title = "LOINC";
    }

    part codeSystemSnomedCt : ClinicalCodeSystemReference {
        attribute redefines canonicalUri = "http://snomed.info/sct";
        attribute redefines version = "international";
        attribute redefines title = "SNOMED CT";
    }

    part valueSetProcedureStatusSummary : ClinicalValueSetReference {
        attribute redefines canonicalUri = "https://memo.example/ValueSet/arthroscopy-procedure-status";
        attribute redefines version = "1.0.0";
        attribute redefines title = "Arthroscopy Procedure Status Summary Value Set";
    }

    part conceptMapDeviceToLoinc : ClinicalConceptMapReference {
        attribute redefines canonicalUri = "https://memo.example/ConceptMap/device-status-to-loinc";
        attribute redefines version = "1.0.0";
        attribute redefines title = "Device Status To LOINC Concept Map";
    }

    part terminologyImportBoundaryPerioperative : TerminologyImportBoundary {
        attribute redefines boundaryId = "TIB-IRR-001";
        attribute redefines scope = "Imported clinical terminology subsets are limited to perioperative device-status and procedure-summary concepts required for documented integrations";
    }

    part importedSubsetSnomedProcedureStatus : ImportedTerminologySubset {
        attribute redefines subsetId = "SUB-IRR-001";
        attribute redefines title = "SNOMED CT perioperative procedure-status subset";
        attribute redefines version = "2026-03";
    }

    part importedSubsetLoincProcedureMetrics : ImportedTerminologySubset {
        attribute redefines subsetId = "SUB-IRR-002";
        attribute redefines title = "LOINC procedure metrics subset";
        attribute redefines version = "2.81";
    }

    part importedBindingProcedureStatusSummary : ImportedConceptBinding {
        attribute redefines bindingId = "ICB-IRR-001";
        attribute redefines localConcept = "ProcedureSummaryPayload.status";
        attribute redefines externalConcept = "SNOMED CT arthroscopy procedure-status subset and mapped LOINC summary";
    }

    part importProvenanceProcedureStatus : ImportProvenanceRecord {
        attribute redefines recordId = "IMP-IRR-001";
        attribute redefines title = "Procedure-status terminology import provenance";
        attribute redefines artifactType = "Terminology import provenance package";
        attribute redefines sourceUri = "http://snomed.info/sct and http://loinc.org";
        attribute redefines sourceVersion = "SNOMED CT 2026-03 / LOINC 2.81";
    }

    part anomalyPressureSpike : SoftwareAnomaly {
        attribute redefines anomalyId = "ANOM-IRR-001";
        attribute redefines title = "Transient pressure spike during cassette replacement";
    }

    part productFamilyArthroscopyPlatform : ProductFamily {
        attribute redefines familyId = "PF-IRR-001";
        attribute redefines name = "Arthroscopy Irrigation Platform";
    }

    part variantIntegratedORConsole : ProductVariant {
        attribute redefines variantId = "PV-IRR-001";
        attribute redefines name = "Integrated OR Console Variant";
    }

    part featureRemoteAlarmIntegration : FeatureOption {
        attribute redefines name = "Remote alarm integration";
        attribute redefines category = "Connectivity";
    }

    part featureProcedureStatusExchange : FeatureOption {
        attribute redefines name = "Procedure-status exchange";
        attribute redefines category = "Interoperability";
    }

    part accessoryDisposableCassetteKit : Accessory {
        attribute redefines accessoryId = "ACC-IRR-001";
        attribute redefines name = "Disposable Arthroscopy Cassette Kit";
    }

    part configIntegratedORRelease20 : ConfigurationBaseline {
        attribute redefines recordId = "CB-IRR-001";
        attribute redefines title = "Integrated OR configuration baseline 2.0";
        attribute redefines version = "2.0.0";
    }

    requirement constraintIntegratedVariantConnectivity : VariantConstraint {
        attribute redefines reqId = "VC-IRR-001";
        attribute redefines title = "Integrated OR variants shall include authenticated alarm routing and documented terminology bindings";
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

    part signalCyberIntegrationReview : ProductionPostProductionSignal {
        attribute redefines recordId = "PPS-IRR-002";
        attribute redefines title = "Remote integration cybersecurity review signal";
        attribute redefines artifactType = "Cybersecurity monitoring review";
        attribute redefines signalId = "SIG-IRR-002";
        attribute redefines sourceType = "Authentication-failure and audit-log review";
    }

    part signalReservoirCollapseTrend : ProductionPostProductionSignal {
        attribute redefines recordId = "PMS-IRR-001";
        attribute redefines title = "Reservoir depletion complaint trend review";
        attribute redefines artifactType = "Post-market complaint trend";
        attribute redefines signalId = "SIG-IRR-001";
        attribute redefines sourceType = "Complaint trend and service review";
    }

    part manufacturingTechnician : OperationalActor {
        attribute redefines name = "Manufacturing Technician";
        attribute redefines role = "Final assembly and release";
    }

    part biomedicalTechnician : OperationalActor {
        attribute redefines name = "Biomedical Technician";
        attribute redefines role = "Installation, calibration, and preventive maintenance";
    }

    part manufacturingCell : OperationalEnvironment {
        attribute redefines name = "Manufacturing Final Assembly Cell";
        attribute redefines setting = "Controlled production line";
    }

    part serviceWorkshop : OperationalEnvironment {
        attribute redefines name = "Biomedical Service Workshop";
        attribute redefines setting = "Hospital clinical engineering bench";
    }

    part calibrationFixture : Resource {
        attribute redefines name = "Pressure calibration fixture";
        attribute redefines category = "Test equipment";
    }

    part serviceLaptop : Resource {
        attribute redefines name = "Service diagnostic laptop";
        attribute redefines category = "Service tool";
    }

    action procManufactureIntegratedConsole : ManufacturingProcedure {
        attribute redefines name = "Manufacture integrated irrigation console";
        attribute redefines objective = "Assemble and release the integrated irrigation console configuration";
    }

    action procInstallIntegratedConsole : InstallationProcedure {
        attribute redefines name = "Install integrated irrigation console";
        attribute redefines objective = "Install and configure the integrated irrigation console in the perioperative environment";
    }

    action procPreventiveMaintenancePressurePath : PreventiveMaintenanceProcedure {
        attribute redefines name = "Perform preventive maintenance on pressure path";
        attribute redefines objective = "Inspect and maintain the pressure-control path and depletion alarm path";
    }

    action procCalibratePressureSensing : CalibrationProcedure {
        attribute redefines name = "Calibrate pressure sensing chain";
        attribute redefines objective = "Calibrate the pressure-sensing chain before release to service";
    }

    part manufacturingRecordIntegratedConsole : ManufacturingRecord {
        attribute redefines recordId = "MR-IRR-001";
        attribute redefines title = "Integrated console manufacturing traveler";
    }

    part installQualificationIntegratedConsole : InstallationQualification {
        attribute redefines recordId = "IQ-IRR-001";
        attribute redefines title = "Integrated console installation qualification";
        attribute redefines artifactType = "Installation qualification report";
    }

    part serviceReportPreventiveMaintenance : ServiceReport {
        attribute redefines recordId = "SR-IRR-001";
        attribute redefines title = "Preventive maintenance and alarm-path inspection report";
    }

    part calibrationRecordPressureChain : CalibrationRecord {
        attribute redefines recordId = "CAL-IRR-001";
        attribute redefines title = "Pressure sensing calibration record";
        attribute redefines artifactType = "Calibration certificate";
    }

    part releaseBaseline20 : ReleaseBaseline {
        attribute redefines recordId = "REL-IRR-001";
        attribute redefines title = "Release baseline 2.0";
        attribute redefines version = "2.0.0";
    }

    action swDevProcessIrrigationController : SoftwareLifecycleProcess {
        attribute redefines name = "Irrigation controller software development process";
    }

    action swMaintProcessIrrigationController : SoftwareLifecycleProcess {
        attribute redefines name = "Irrigation controller software maintenance process";
    }

    action swRequirementsPressureControl : SoftwareLifecycleActivity {
        attribute redefines name = "Analyze pressure control and alarm requirements";
    }

    action swArchitecturePressureControl : SoftwareLifecycleActivity {
        attribute redefines name = "Design pressure control and alarm software architecture";
    }

    action swVerificationPressureControl : SoftwareLifecycleActivity {
        attribute redefines name = "Verify pressure regulation and reservoir alarm implementation";
    }

    action swProblemResolutionPressureSpike : SoftwareLifecycleActivity {
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

    part testCyberIntegration : Test {
        attribute redefines testId = "TC-IRR-CY-001";
        attribute redefines name = "Cybersecurity integration verification";
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
    connection : ClaimsForUse connect claim ::> claimControlledVisualization to subject ::> intendedUseIrrigationConsole;
    connection : ClaimsForUse connect claim ::> claimControlledVisualization to subject ::> indicationArthroscopyIrrigation;
    connection : ClaimsForUse connect claim ::> claimSafeAlarmedContinuity to subject ::> intendedUseIrrigationConsole;
    connection : ClaimsForUse connect claim ::> claimSafeAlarmedContinuity to subject ::> indicationArthroscopyIrrigation;
    connection : ClaimsClinicalBenefit connect claim ::> claimControlledVisualization to benefit ::> benefitSustainedVisualization;
    connection : ClaimsClinicalBenefit connect claim ::> claimSafeAlarmedContinuity to benefit ::> benefitSustainedVisualization;
    connection : PlansClinicalEvaluation connect plan ::> clinicalEvalPlanIrrigationConsole to subject ::> claimControlledVisualization;
    connection : PlansClinicalEvaluation connect plan ::> clinicalEvalPlanIrrigationConsole to subject ::> claimSafeAlarmedContinuity;
    connection : SupportsClinicalClaim connect evidence ::> clinicalEvidenceArthroscopyLiterature to claim ::> claimControlledVisualization;
    connection : SupportsClinicalClaim connect evidence ::> clinicalEvidenceFieldExperience to claim ::> claimSafeAlarmedContinuity;
    connection : EvaluatesClinicalClaim connect report ::> clinicalEvalReportIrrigationConsole to claim ::> claimControlledVisualization;
    connection : EvaluatesClinicalClaim connect report ::> clinicalEvalReportIrrigationConsole to claim ::> claimSafeAlarmedContinuity;
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
    connection : MonitorsRiskSubject connect signal ::> signalCyberIntegrationReview to subject ::> scMutualTlsGateway;
    connection : MonitorsRiskSubject connect signal ::> signalCyberIntegrationReview to subject ::> scRemoteAuditTrail;

    connection : Satisfy connect satisfiedBy ::> alarmCoordinatorModule to satisfies ::> cyberReqAuthenticatedAlarmIntegration;
    connection : Satisfy connect satisfiedBy ::> perioperativeDocumentationSystem to satisfies ::> cyberReqAuthorizedStatusExchange;
    connection : Satisfy connect satisfiedBy ::> secureUpdateIrrigationController to satisfies ::> cyberReqAuditRemoteEvents;
    connection : ModelsThreat connect model ::> threatModelIntegratedORConnectivity to threat ::> threatUnauthorizedAlarmSuppression;
    connection : ModelsThreat connect model ::> threatModelIntegratedORConnectivity to threat ::> threatProcedureStatusDisclosure;
    connection : ThreatensAsset connect threat ::> threatUnauthorizedAlarmSuppression to asset ::> assetAlarmIntegrationChannel;
    connection : ThreatensAsset connect threat ::> threatProcedureStatusDisclosure to asset ::> assetProcedureStatusChannel;
    connection : ExploitsVulnerability connect threat ::> threatUnauthorizedAlarmSuppression to vulnerability ::> vulnSharedIntegrationCredential;
    connection : ExploitsVulnerability connect threat ::> threatProcedureStatusDisclosure to vulnerability ::> vulnWeakAuditCoverage;
    connection : MitigatesThreat connect control ::> scMutualTlsGateway to threat ::> threatUnauthorizedAlarmSuppression;
    connection : MitigatesThreat connect control ::> scRoleScopedApiAccess to threat ::> threatProcedureStatusDisclosure;
    connection : MitigatesThreat connect control ::> scRemoteAuditTrail to threat ::> threatProcedureStatusDisclosure;
    connection : SecuresInterface connect control ::> scMutualTlsGateway to dataInterface ::> AlarmStatusFHIRInterface;
    connection : SecuresInterface connect control ::> scMutualTlsGateway to dataInterface ::> ProcedureStatusFHIRInterface;
    connection : SecuresInterface connect control ::> scRoleScopedApiAccess to dataInterface ::> ProcedureStatusFHIRInterface;
    connection : SecuresInterface connect control ::> scRemoteAuditTrail to dataInterface ::> AlarmStatusFHIRInterface;
    connection : MaintainsSbom connect sbom ::> sbomIrrigationRelease to subject ::> swSystemIrrigationController;
    connection : MaintainsSbom connect sbom ::> sbomIrrigationRelease to subject ::> soupUiFramework;
    connection : SupportsSecureUpdate connect capability ::> secureUpdateIrrigationController to subject ::> swSystemIrrigationController;
    connection : SupportsSecureUpdate connect capability ::> secureUpdateIrrigationController to subject ::> assetAlarmIntegrationChannel;
    connection : ClassifiesData connect classification ::> dataClassProcedureSummaryPayload to subject ::> ProcedureSummaryPayload;
    connection : ClassifiesData connect classification ::> dataClassProcedureSummaryPayload to subject ::> ProcedureStatusFHIRInterface;
    connection : ClassifiesData connect classification ::> dataClassPerioperativeObservation to subject ::> obsJointDistensionMaintained;
    connection : ClassifiesData connect classification ::> dataClassPerioperativeObservation to subject ::> patientCase;
    connection : ProcessesData connect activity ::> procProcedureStatusExchange to subject ::> ProcedureSummaryPayload;
    connection : ProcessesData connect activity ::> procProcedureStatusExchange to subject ::> ProcedureStatusFHIRInterface;
    connection : ProcessesData connect activity ::> procAlarmStatusRelay to subject ::> AlarmStatusPayload;
    connection : ProcessesData connect activity ::> procAlarmStatusRelay to subject ::> AlarmStatusFHIRInterface;
    connection : ProcessesData connect activity ::> procQualityAnalyticsExport to subject ::> ProcedureSummaryPayload;
    connection : GovernedByProcessingBasis connect activity ::> procProcedureStatusExchange to basis ::> basisHipaaTreatmentIntegration;
    connection : GovernedByProcessingBasis connect activity ::> procProcedureStatusExchange to basis ::> basisGdprClinicalCare;
    connection : GovernedByProcessingBasis connect activity ::> procAlarmStatusRelay to basis ::> basisHipaaTreatmentIntegration;
    connection : GovernedByProcessingBasis connect activity ::> procAlarmStatusRelay to basis ::> basisGdprClinicalCare;
    connection : GovernedByProcessingBasis connect activity ::> procQualityAnalyticsExport to basis ::> basisGdprExplicitConsentAnalytics;
    connection : ControlsProcessing connect controller ::> hospitalControllerRole to activity ::> procProcedureStatusExchange;
    connection : ControlsProcessing connect controller ::> hospitalControllerRole to activity ::> procAlarmStatusRelay;
    connection : ControlsProcessing connect controller ::> hospitalControllerRole to activity ::> procQualityAnalyticsExport;
    connection : ProcessesOnBehalfOf connect processor ::> integrationVendorProcessorRole to activity ::> procProcedureStatusExchange;
    connection : ProcessesOnBehalfOf connect processor ::> integrationVendorProcessorRole to activity ::> procAlarmStatusRelay;
    connection : RequiresConsent connect subject ::> procQualityAnalyticsExport to consent ::> consentQualityAnalyticsReuse;
    connection : ProvidesPrivacyNotice connect subject ::> ProcedureStatusFHIRInterface to notice ::> privacyNoticePerioperativeIntegration;
    connection : ProvidesPrivacyNotice connect subject ::> AlarmStatusFHIRInterface to notice ::> privacyNoticePerioperativeIntegration;
    connection : GovernedByRetentionPolicy connect subject ::> ProcedureStatusFHIRInterface to policy ::> retentionPolicyProcedureStatus;
    connection : GovernedByRetentionPolicy connect subject ::> procQualityAnalyticsExport to policy ::> retentionPolicyProcedureStatus;
    connection : AppliesMinimumNecessary connect activity ::> procProcedureStatusExchange to policy ::> minimumNecessaryProcedureStatus;
    connection : AppliesMinimumNecessary connect activity ::> procAlarmStatusRelay to policy ::> minimumNecessaryProcedureStatus;
    connection : AppliesMinimumNecessary connect activity ::> procQualityAnalyticsExport to policy ::> minimumNecessaryProcedureStatus;
    connection : DeIdentifiesData connect method ::> deIdentificationAnalyticsExport to subject ::> procQualityAnalyticsExport;
    connection : PseudonymizesData connect method ::> pseudonymizationProcedureStatus to subject ::> procQualityAnalyticsExport;
    connection : AssessesPrivacyImpact connect assessment ::> privacyAssessmentConnectedOR to subject ::> procProcedureStatusExchange;
    connection : AssessesPrivacyImpact connect assessment ::> privacyAssessmentConnectedOR to subject ::> procAlarmStatusRelay;
    connection : AssessesPrivacyImpact connect assessment ::> privacyAssessmentConnectedOR to subject ::> ProcedureStatusFHIRInterface;
    connection : AssessesPrivacyImpact connect assessment ::> privacyAssessmentConnectedOR to subject ::> terminologyImportBoundaryPerioperative;
    connection : RespondsToDataSubjectRequest connect request ::> accessRequestProcedureStatusLogs to subject ::> procProcedureStatusExchange;
    connection : RespondsToDataSubjectRequest connect request ::> erasureRequestAnalyticsExport to subject ::> procQualityAnalyticsExport;
    connection : BindsTerminology connect binding ::> terminologyBindingProcedureStatus to subject ::> ProcedureStatusFHIRInterface;
    connection : ReferencesCodeSystem connect binding ::> terminologyBindingProcedureStatus to codeSystem ::> codeSystemSnomedCt;
    connection : ReferencesValueSet connect binding ::> terminologyBindingProcedureStatus to valueSet ::> valueSetProcedureStatusSummary;
    connection : UsesConceptMap connect binding ::> terminologyBindingProcedureStatus to conceptMap ::> conceptMapDeviceToLoinc;
    connection : ScopesTerminologyReference connect subset ::> importedSubsetSnomedProcedureStatus to reference ::> codeSystemSnomedCt;
    connection : ScopesTerminologyReference connect subset ::> importedSubsetLoincProcedureMetrics to reference ::> codeSystemLoinc;
    connection : BindsImportedConcept connect binding ::> terminologyBindingProcedureStatus to importedConcept ::> importedBindingProcedureStatusSummary;
    connection : GovernedByImportBoundary connect boundary ::> terminologyImportBoundaryPerioperative to subject ::> terminologyBindingProcedureStatus;
    connection : GovernedByImportBoundary connect boundary ::> terminologyImportBoundaryPerioperative to subject ::> conceptMapDeviceToLoinc;
    connection : GovernedByImportBoundary connect boundary ::> terminologyImportBoundaryPerioperative to subject ::> importedSubsetSnomedProcedureStatus;
    connection : GovernedByImportBoundary connect boundary ::> terminologyImportBoundaryPerioperative to subject ::> importedSubsetLoincProcedureMetrics;
    connection : ProvidesImportProvenance connect record ::> importProvenanceProcedureStatus to subject ::> importedSubsetSnomedProcedureStatus;
    connection : ProvidesImportProvenance connect record ::> importProvenanceProcedureStatus to subject ::> importedSubsetLoincProcedureMetrics;
    connection : ProvidesImportProvenance connect record ::> importProvenanceProcedureStatus to subject ::> importedBindingProcedureStatusSummary;
    connection : MapsSourceCodeSystem connect conceptMap ::> conceptMapDeviceToLoinc to sourceSystem ::> codeSystemDeviceStatus;
    connection : MapsTargetCodeSystem connect conceptMap ::> conceptMapDeviceToLoinc to targetSystem ::> codeSystemLoinc;
    connection : HasProductVariant connect family ::> productFamilyArthroscopyPlatform to variant ::> variantIntegratedORConsole;
    connection : SelectsFeature connect variant ::> variantIntegratedORConsole to feature ::> featureRemoteAlarmIntegration;
    connection : SelectsFeature connect variant ::> variantIntegratedORConsole to feature ::> featureProcedureStatusExchange;
    connection : SupportsAccessory connect subject ::> variantIntegratedORConsole to accessory ::> accessoryDisposableCassetteKit;
    connection : ConfiguresItem connect baseline ::> configIntegratedORRelease20 to subject ::> irrigationConsole;
    connection : ConfiguresItem connect baseline ::> configIntegratedORRelease20 to subject ::> swSystemIrrigationController;
    connection : ConfiguresItem connect baseline ::> configIntegratedORRelease20 to subject ::> AlarmStatusFHIRInterface;
    connection : ConfiguresItem connect baseline ::> configIntegratedORRelease20 to subject ::> ProcedureStatusFHIRInterface;
    connection : ConstrainsVariant connect constraint ::> constraintIntegratedVariantConnectivity to variant ::> variantIntegratedORConsole;
    connection : ManufacturesSubject connect procedure ::> procManufactureIntegratedConsole to subject ::> irrigationConsole;
    connection : InstallsSubject connect procedure ::> procInstallIntegratedConsole to subject ::> irrigationConsole;
    connection : ServicesSubject connect procedure ::> procPreventiveMaintenancePressurePath to subject ::> irrigationConsole;
    connection : MaintainsSubject connect procedure ::> procPreventiveMaintenancePressurePath to subject ::> reservoirScale;
    connection : MaintainsSubject connect procedure ::> procPreventiveMaintenancePressurePath to subject ::> pressureSensorBoard;
    connection : CalibratesSubject connect procedure ::> procCalibratePressureSensing to subject ::> pressureSensorBoard;
    connection : QualifiesInstallation connect qualification ::> installQualificationIntegratedConsole to subject ::> irrigationConsole;
    connection : PerformedBy connect procedure ::> procManufactureIntegratedConsole to performer ::> manufacturingTechnician;
    connection : PerformedBy connect procedure ::> procInstallIntegratedConsole to performer ::> biomedicalTechnician;
    connection : PerformedBy connect procedure ::> procPreventiveMaintenancePressurePath to performer ::> biomedicalTechnician;
    connection : PerformedBy connect procedure ::> procCalibratePressureSensing to performer ::> biomedicalTechnician;
    connection : OccursIn connect procedure ::> procManufactureIntegratedConsole to environment ::> manufacturingCell;
    connection : OccursIn connect procedure ::> procInstallIntegratedConsole to environment ::> operatingRoom;
    connection : OccursIn connect procedure ::> procPreventiveMaintenancePressurePath to environment ::> serviceWorkshop;
    connection : OccursIn connect procedure ::> procCalibratePressureSensing to environment ::> serviceWorkshop;
    connection : UsesResource connect procedure ::> procManufactureIntegratedConsole to resource ::> disposableCassette;
    connection : UsesResource connect procedure ::> procInstallIntegratedConsole to resource ::> serviceLaptop;
    connection : UsesResource connect procedure ::> procPreventiveMaintenancePressurePath to resource ::> serviceLaptop;
    connection : UsesResource connect procedure ::> procCalibratePressureSensing to resource ::> calibrationFixture;

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
    connection : Verify connect verifiedBy ::> testCyberIntegration to verifies ::> scMutualTlsGateway;
    connection : Verify connect verifiedBy ::> testCyberIntegration to verifies ::> scRoleScopedApiAccess;
    connection : Verify connect verifiedBy ::> testCyberIntegration to verifies ::> scRemoteAuditTrail;
    connection : Verify connect verifiedBy ::> testCyberIntegration to verifies ::> cyberReqAuthenticatedAlarmIntegration;
    connection : Verify connect verifiedBy ::> testCyberIntegration to verifies ::> cyberReqAuthorizedStatusExchange;
    connection : Verify connect verifiedBy ::> testCyberIntegration to verifies ::> cyberReqAuditRemoteEvents;

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
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> threatModelIntegratedORConnectivity;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> sbomIrrigationRelease;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> secureUpdateIrrigationController;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> procProcedureStatusExchange;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> procAlarmStatusRelay;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> procQualityAnalyticsExport;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> hospitalControllerRole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> integrationVendorProcessorRole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> consentQualityAnalyticsReuse;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> privacyNoticePerioperativeIntegration;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> retentionPolicyProcedureStatus;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> privacyAssessmentConnectedOR;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> terminologyBindingProcedureStatus;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> terminologyImportBoundaryPerioperative;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> importedSubsetSnomedProcedureStatus;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> importedSubsetLoincProcedureMetrics;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> importedBindingProcedureStatusSummary;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> importProvenanceProcedureStatus;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> collateralAlarmStandard;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> particularIrrigationStandard;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> clinicalEvalPlanIrrigationConsole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> clinicalEvalReportIrrigationConsole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> clinicalEvidenceArthroscopyLiterature;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> clinicalEvidenceFieldExperience;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> productFamilyArthroscopyPlatform;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> variantIntegratedORConsole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> configIntegratedORRelease20;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> procManufactureIntegratedConsole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> procInstallIntegratedConsole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> procPreventiveMaintenancePressurePath;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> procCalibratePressureSensing;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> manufacturingRecordIntegratedConsole;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> serviceReportPreventiveMaintenance;
    connection : Documents connect record ::> dhfIrrigationTrace to subject ::> calibrationRecordPressureChain;

    connection : Evidences connect evidence ::> evidenceFormativePrimeWorkflow to subject ::> formativeEvalPrimeWorkflow;
    connection : Evidences connect evidence ::> evidenceFormativePrimeWorkflow to subject ::> useErrorAnalysisPrimeWorkflow;
    connection : Evidences connect evidence ::> evidenceSummativePrimeWorkflow to subject ::> summativeEvalPrimeWorkflow;
    connection : Evidences connect evidence ::> evidenceSummativePrimeWorkflow to subject ::> uiReqPrimeConfirmation;
    connection : Evidences connect evidence ::> signalReservoirCollapseTrend to subject ::> overallResidualRiskEvalIrrigation;
    connection : Evidences connect evidence ::> signalCyberIntegrationReview to subject ::> threatModelIntegratedORConnectivity;
    connection : Evidences connect evidence ::> clinicalEvidenceArthroscopyLiterature to subject ::> claimControlledVisualization;
    connection : Evidences connect evidence ::> clinicalEvidenceFieldExperience to subject ::> claimSafeAlarmedContinuity;
    connection : Evidences connect evidence ::> installQualificationIntegratedConsole to subject ::> procInstallIntegratedConsole;
    connection : Evidences connect evidence ::> calibrationRecordPressureChain to subject ::> procCalibratePressureSensing;

    connection : Documents connect record ::> releaseBaseline20 to subject ::> swSystemIrrigationController;
    connection : Documents connect record ::> releaseBaseline20 to subject ::> swItemPressureController;
    connection : Documents connect record ::> releaseBaseline20 to subject ::> swItemAlarmSupervisor;
    connection : Documents connect record ::> releaseBaseline20 to subject ::> soupEvalUiFramework;
    connection : Documents connect record ::> releaseBaseline20 to subject ::> sbomIrrigationRelease;
    connection : Documents connect record ::> manufacturingRecordIntegratedConsole to subject ::> procManufactureIntegratedConsole;
    connection : Documents connect record ::> manufacturingRecordIntegratedConsole to subject ::> irrigationConsole;
    connection : Documents connect record ::> serviceReportPreventiveMaintenance to subject ::> procPreventiveMaintenancePressurePath;
    connection : Documents connect record ::> serviceReportPreventiveMaintenance to subject ::> pressureSensorBoard;
}
