package MEMO_Extension_Medical_Usability_Relationships {

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
}
