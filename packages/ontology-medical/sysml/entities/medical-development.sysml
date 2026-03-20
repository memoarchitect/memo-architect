package MEMO_Ontology_Medical_Development {

    requirement def UserNeed :> StakeholderNeed { }

    requirement def SoftwareRequirement :> TechnicalRequirement {
        attribute safetyClassification : String;
    }

    requirement def HardwareRequirement :> TechnicalRequirement { }

    requirement def OtherRequirement :> Requirement { }

    action def UserActivity :> OperationalActivity { }

    part def Component :> LogicalComponent { }

    part def EnvironmentElement :> OperationalEntity { }
}
