package MEMO_Ontology_MedicalArch_Development {

    // §4.5.12 — UserActivity kept distinct from OperationalActivity because it
    // participates in usability-engineering relations (IEC 62366-1) that
    // generic activities do not; carries user-role metadata explicitly.
    action def UserActivity :> OperationalActivity {
        attribute userRole : String;        // "clinician" | "patient" | "technician"
        attribute taskCriticality : String; // "routine" | "critical" | "emergency"
    }

    // Environmental element of the operational context — distinguished from a
    // generic Resource by an exposure/coupling attribute.
    part def EnvironmentElement :> Resource {
        attribute couplingKind : String;    // "input" | "output" | "constraint"
    }
}
