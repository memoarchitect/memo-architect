package MEMO_Extension_Medical_Safety {

    requirement def SafetyGoal {
        attribute title : String;
    }

    requirement def EssentialPerformance {
        attribute title : String;
    }

    requirement def BasicSafety {
        attribute title : String;
    }

    requirement def PrimaryOperatingFunction :> EssentialPerformance { }

    requirement def EssentialPerformanceLossCondition {
        attribute title : String;
    }

    action def SafetyFunction {
        attribute name : String;
    }

    part def ProtectiveMeasure {
        attribute name : String;
    }

    part def CollateralStandardRequirement :> RegulatoryRequirement { }

    part def ParticularStandardRequirement :> RegulatoryRequirement { }
}
