package MEMO_Ontology_Core_Requirements {

    enum def RequirementCategory {
        enum Functional;
        enum Technical;
        enum Interface;
        enum Constraint;
        enum Verification;
    }

    requirement def Requirement {
        attribute reqId : String;
        attribute title : String;
        attribute priority : String;
        attribute status : String;
        attribute rationale : String;
        attribute category : RequirementCategory;
    }

    requirement def StakeholderNeed :> Requirement { }

    requirement def SystemRequirement :> Requirement { }

    requirement def FunctionalRequirement :> Requirement { }

    requirement def TechnicalRequirement :> Requirement { }

    requirement def InterfaceRequirement :> Requirement { }

    requirement def Specification :> Requirement { }
}
