package MEMO_Ontology_Clinical {

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

    part def ClinicalInvestigationReference :> ClinicalEvidenceArtifact { }

    part def ClinicalLiteratureReference :> ClinicalEvidenceArtifact { }
}
