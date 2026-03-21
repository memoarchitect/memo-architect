package MEMO_Ontology_Medical_Safety {

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

    action def SafetyFunction {
        attribute name : String;
    }

    part def ProtectiveMeasure {
        attribute name : String;
    }
}
