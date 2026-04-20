package MEMO_Ontology_MedicalProcess_ClinicalContext {

    part def Patient :> OperationalEntity {
        attribute careContext : String;
    }

    // §4.5.2 — clinical step within a procedure, ordered.
    action def ClinicalStep :> Procedure {
        attribute stepOrder : Integer;
        attribute clinicalRole : String;    // "physician" | "nurse" | "technician"
    }

    // §4.5.2 — treatment pathway groups procedures under a clinical indication.
    action def TreatmentPathway :> Procedure {
        attribute indication : String;
        attribute careSetting : String;     // "inpatient" | "outpatient" | "home"
    }
}
