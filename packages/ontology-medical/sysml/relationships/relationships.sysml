package MEMO_Ontology_Medical_Relationships {

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
        end scenario : HazardRelatedUseScenario [1];
        end useError : UseError [1];
    }

    connection def SpecifiesScenario {
        end specification : UseSpecification [1];
        end scenario : HazardRelatedUseScenario [1];
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
