package MEMO_Extension_Medical_ClinicalContext {

    part def Patient :> OperationalEntity {
        attribute careContext : String;
    }

    action def ClinicalStep :> Procedure { }

    action def TreatmentPathway :> Procedure { }
}
