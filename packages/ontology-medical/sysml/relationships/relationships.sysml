package MEMO_Ontology_Medical_Relationships {

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
