package MEMO_Extension_Requirements_Advanced {

    requirement def MissionRequirement :> Requirement { }

    requirement def MissionSpecification :> Specification { }

    requirement def FunctionSpecification :> Specification { }

    requirement def SystemSpecification :> Specification { }

    requirement def DesignSpecification :> Specification { }

    part def RequirementSet {
        attribute name : String;
    }
}
