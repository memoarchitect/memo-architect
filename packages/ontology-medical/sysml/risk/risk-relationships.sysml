package MEMO_Ontology_Medical_Risk_Relationships {

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
        end subject [1];
    }

    connection def AssessesResidualRisk {
        end evaluation : ResidualRiskEvaluation [1];
        end subject [1];
    }

    connection def WeighsAgainstBenefit {
        end assessment : BenefitRiskAssessment [1];
        end benefit : ClinicalBenefit [1];
    }

    connection def ConcludesBenefitRisk {
        end assessment : BenefitRiskAssessment [1];
        end subject [1];
    }

    connection def ConcludesOverallResidualRisk {
        end report : RiskManagementReport [1];
        end evaluation : OverallResidualRiskEvaluation [1];
    }

    connection def MonitorsRiskSubject {
        end signal : ProductionPostProductionSignal [1];
        end subject [1];
    }

    connection def ImplementsRiskControl {
        end implementer [1];
        end control : RiskControl [1];
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
        end subject [1];
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
        end event [1];
        end gate : FaultTreeGate [1];
    }

    connection def ContributesToEvent {
        end contributor [1];
        end event [1];
    }

    connection def TriggersHazardousSituation {
        end event [1];
        end situation : HazardousSituation [1];
    }

    connection def InitiatesSequence {
        end hazard : Hazard [1];
        end sequence : SequenceOfEvents [1];
    }

    connection def CulminatesInSituation {
        end sequence : SequenceOfEvents [1];
        end situation : HazardousSituation [1];
    }

    connection def HasInitialRisk {
        end risk : Risk [1];
        end assessment : InitialRiskAssessment [1];
    }

    connection def HasResidualRisk {
        end risk : Risk [1];
        end assessment : ResidualRiskAssessment [1];
    }

    connection def UsesRiskMatrix {
        end risk : Risk [1];
        end matrix : RiskMatrix [1];
    }

    connection def DefinesCell {
        end matrix : RiskMatrix [1];
        end cell : RiskMatrixCell [0..*];
    }
}
