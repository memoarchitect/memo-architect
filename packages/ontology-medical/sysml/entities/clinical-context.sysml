package MEMO_Ontology_Medical_ClinicalContext {

    part def Patient :> OperationalEntity {
        attribute careContext : String;
    }

    part def AnatomicalSite :> OperationalEntity {
        attribute bodyRegion : String;
        attribute laterality : String;
    }

    part def ProcedureMethod {
        attribute name : String;
        attribute methodType : String;
    }

    part def RouteOfAdministration {
        attribute name : String;
        attribute routeType : String;
    }

    action def ClinicalStep :> Procedure { }

    action def TreatmentPathway :> Procedure { }

    part def ClinicalObservation :> Observable {
        attribute interpretation : String;
    }

    part def MorphologyState :> Observable {
        attribute state : String;
    }

    part def ClinicalEnvironmentQualifier {
        attribute name : String;
        attribute qualifierType : String;
    }
}
