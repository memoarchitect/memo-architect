package MEMO_Ontology_Medical_Relationships {

    connection def PlansClinicalEvaluation {
        end plan : ClinicalEvaluationPlan [1];
        end subject[1];
    }

    connection def EvaluatesClinicalClaim {
        end report : ClinicalEvaluationReport [1];
        end claim : ClinicalClaim [1];
    }

    connection def SupportsClinicalClaim {
        end evidence : ClinicalEvidenceArtifact [1];
        end claim : ClinicalClaim [1];
    }

    connection def ClaimsClinicalBenefit {
        end claim : ClinicalClaim [1];
        end benefit : ClinicalBenefit [1];
    }

    connection def ClaimsForUse {
        end claim : ClinicalClaim [1];
        end subject[1];
    }

    connection def ManufacturesSubject {
        end procedure : ManufacturingProcedure [1];
        end subject[1];
    }

    connection def InstallsSubject {
        end procedure : InstallationProcedure [1];
        end subject[1];
    }

    connection def ServicesSubject {
        end procedure : ServiceProcedure [1];
        end subject[1];
    }

    connection def MaintainsSubject {
        end procedure : PreventiveMaintenanceProcedure [1];
        end subject[1];
    }

    connection def CalibratesSubject {
        end procedure : CalibrationProcedure [1];
        end subject[1];
    }

    connection def QualifiesInstallation {
        end qualification : InstallationQualification [1];
        end subject[1];
    }

    connection def HasProductVariant {
        end family : ProductFamily [1];
        end variant : ProductVariant [1];
    }

    connection def SelectsFeature {
        end variant : ProductVariant [1];
        end feature : FeatureOption [1];
    }

    connection def SupportsAccessory {
        end subject[1];
        end accessory : Accessory [1];
    }

    connection def ConfiguresItem {
        end baseline : ConfigurationBaseline [1];
        end subject[1];
    }

    connection def ConstrainsVariant {
        end constraint : VariantConstraint [1];
        end variant : ProductVariant [1];
    }

    connection def HasAnatomicalSite {
        end subject[1];
        end site : AnatomicalSite [1];
    }

    connection def UsesMethod {
        end procedure : Procedure [1];
        end method : ProcedureMethod [1];
    }

    connection def UsesRoute {
        end procedure : Procedure [1];
        end route : RouteOfAdministration [1];
    }

    connection def ProducesObservation {
        end procedure : Procedure [1];
        end observation : ClinicalObservation [1];
    }

    connection def ObservesSubject {
        end observation : ClinicalObservation [1];
        end subject[1];
    }

    connection def AffectsMorphology {
        end procedure : Procedure [1];
        end morphology : MorphologyState [1];
    }

    connection def AppliesEnvironmentQualifier {
        end environment : OperationalEnvironment [1];
        end qualifier : ClinicalEnvironmentQualifier [1];
    }

    connection def Mitigates {
        end control : RiskControl [1];
        end hazard : Hazard [1];
    }

    connection def Causes {
        end hazard : Hazard [1];
        end situation : HazardousSituation [1];
    }

    connection def LeadsTo {
        end situation : HazardousSituation [1];
        end harm : Harm [1];
    }

    connection def Identifies {
        end risk : Risk [1];
        end hazard : Hazard [1];
    }

    connection def PlansRiskManagement {
        end plan : RiskManagementPlan [1];
        end subject[1];
    }

    connection def AssessesResidualRisk {
        end evaluation : ResidualRiskEvaluation [1];
        end subject[1];
    }

    connection def WeighsAgainstBenefit {
        end assessment : BenefitRiskAssessment [1];
        end benefit : ClinicalBenefit [1];
    }

    connection def ConcludesBenefitRisk {
        end assessment : BenefitRiskAssessment [1];
        end subject[1];
    }

    connection def ConcludesOverallResidualRisk {
        end report : RiskManagementReport [1];
        end evaluation : OverallResidualRiskEvaluation [1];
    }

    connection def MonitorsRiskSubject {
        end signal : ProductionPostProductionSignal [1];
        end subject[1];
    }

    connection def ModelsThreat {
        end model : ThreatModel [1];
        end threat : ThreatScenario [1];
    }

    connection def ThreatensAsset {
        end threat : ThreatScenario [1];
        end asset : CyberAsset [1];
    }

    connection def ExploitsVulnerability {
        end threat : ThreatScenario [1];
        end vulnerability : Vulnerability [1];
    }

    connection def MitigatesThreat {
        end control : SecurityControl [1];
        end threat : ThreatScenario [1];
    }

    connection def SecuresInterface {
        end control : SecurityControl [1];
        end dataInterface : DataInterface [1];
    }

    connection def MaintainsSbom {
        end sbom : SBOMArtifact [1];
        end subject[1];
    }

    connection def SupportsSecureUpdate {
        end capability : SecureUpdateCapability [1];
        end subject[1];
    }

    connection def BindsTerminology {
        end binding : TerminologyBinding [1];
        end subject[1];
    }

    connection def ReferencesCodeSystem {
        end binding : TerminologyBinding [1];
        end codeSystem : ClinicalCodeSystemReference [1];
    }

    connection def ReferencesValueSet {
        end binding : TerminologyBinding [1];
        end valueSet : ClinicalValueSetReference [1];
    }

    connection def UsesConceptMap {
        end binding : TerminologyBinding [1];
        end conceptMap : ClinicalConceptMapReference [1];
    }

    connection def MapsSourceCodeSystem {
        end conceptMap : ClinicalConceptMapReference [1];
        end sourceSystem : ClinicalCodeSystemReference [1];
    }

    connection def MapsTargetCodeSystem {
        end conceptMap : ClinicalConceptMapReference [1];
        end targetSystem : ClinicalCodeSystemReference [1];
    }

    connection def ClassifiesData {
        end classification : PersonalDataCategory [1];
        end subject[1];
    }

    connection def ProcessesData {
        end activity : DataProcessingActivity [1];
        end subject[1];
    }

    connection def GovernedByProcessingBasis {
        end activity : DataProcessingActivity [1];
        end basis : ProcessingBasis [1];
    }

    connection def RequiresConsent {
        end subject[1];
        end consent : ConsentRecord [1];
    }

    connection def ProvidesPrivacyNotice {
        end subject[1];
        end notice : PrivacyNotice [1];
    }

    connection def GovernedByRetentionPolicy {
        end subject[1];
        end policy : DataRetentionPolicy [1];
    }

    connection def AppliesMinimumNecessary {
        end activity : DataProcessingActivity [1];
        end policy : MinimumNecessaryPolicy [1];
    }

    connection def DeIdentifiesData {
        end method : DeIdentificationMethod [1];
        end subject[1];
    }

    connection def PseudonymizesData {
        end method : PseudonymizationMethod [1];
        end subject[1];
    }

    connection def ControlsProcessing {
        end controller : DataControllerRole [1];
        end activity : DataProcessingActivity [1];
    }

    connection def ProcessesOnBehalfOf {
        end processor : DataProcessorRole [1];
        end activity : DataProcessingActivity [1];
    }

    connection def AssessesPrivacyImpact {
        end assessment : PrivacyImpactAssessment [1];
        end subject[1];
    }

    connection def RespondsToDataSubjectRequest {
        end request : DataSubjectRequest [1];
        end subject[1];
    }

    connection def ScopesTerminologyReference {
        end subset : ImportedTerminologySubset [1];
        end reference : ClinicalCodeSystemReference [1];
    }

    connection def BindsImportedConcept {
        end binding : TerminologyBinding [1];
        end importedConcept : ImportedConceptBinding [1];
    }

    connection def GovernedByImportBoundary {
        end boundary : TerminologyImportBoundary [1];
        end subject[1];
    }

    connection def ProvidesImportProvenance {
        end record : ImportProvenanceRecord [1];
        end subject[1];
    }

    connection def AnalyzesFailureMode {
        end analysis : FailureModesAndEffectsAnalysis [1];
        end failureMode : FailureMode [1];
    }

    connection def HasFailureCause {
        end failureMode : FailureMode [1];
        end cause : FailureCause [1];
    }

    connection def ResultsInFailureEffect {
        end failureMode : FailureMode [1];
        end effect : FailureEffect [1];
    }

    connection def EscalatesToRisk {
        end effect : FailureEffect [1];
        end subject[1];
    }

    connection def DetectsFailureMode {
        end control : RiskControl [1];
        end failureMode : FailureMode [1];
    }

    connection def DefinesTopEvent {
        end analysis : FaultTreeAnalysis [1];
        end topEvent : TopEvent [1];
    }

    connection def UsesGate {
        end event[1];
        end gate : FaultTreeGate [1];
    }

    connection def ContributesToEvent {
        end contributor[1];
        end event[1];
    }

    connection def TriggersHazardousSituation {
        end event[1];
        end situation : HazardousSituation [1];
    }

    connection def Preserves {
        end function : SafetyFunction [1];
        end performance : EssentialPerformance [1];
    }

    connection def AddressesUseError {
        end uiRequirement : UserInterfaceRequirement [1];
        end useError : UseError [1];
    }

    connection def AnalyzesUseError {
        end analysis : UseErrorAnalysis [1];
        end useError : UseError [1];
    }

    connection def ExposesUseError {
        end scenario : OperationalScenario [1];
        end useError : UseError [1];
    }

    connection def SpecifiesScenario {
        end specification : UseSpecification [1];
        end scenario : OperationalScenario [1];
    }

    connection def EvaluatesRequirement {
        end evaluation : ValidationCase [1];
        end uiRequirement : UserInterfaceRequirement [1];
    }

    connection def ContributesToHazard {
        end useError : UseError [1];
        end hazard : Hazard [1];
    }

    connection def SupportsOperatingFunction {
        end performance : EssentialPerformance [1];
        end function : PrimaryOperatingFunction [1];
    }

    connection def DefinesLossCondition {
        end performance : EssentialPerformance [1];
        end condition : EssentialPerformanceLossCondition [1];
    }

    connection def ProtectsEssentialPerformance {
        end control : RiskControl [1];
        end performance : EssentialPerformance [1];
    }

    connection def AppliesStandardRequirement {
        end standardRequirement : RegulatoryRequirement [1];
        end subject[1];
    }

    connection def ImplementsRiskControl {
        end implementer[1];
        end control : RiskControl [1];
    }

    connection def GovernsActivity {
        end process : SoftwareLifecycleProcess [1];
        end activity : SoftwareLifecycleActivity [1];
    }

    connection def ProducesWorkProduct {
        end activity : SoftwareLifecycleActivity [1];
        end workProduct : SoftwareWorkProduct [1];
    }

    connection def Evidences {
        end evidence : ComplianceEvidence [1];
        end subject[1];
    }

    connection def Documents {
        end record : QMSRecord [1];
        end subject[1];
    }
}
