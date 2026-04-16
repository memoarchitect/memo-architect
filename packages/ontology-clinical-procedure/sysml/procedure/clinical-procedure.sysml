package MEMO_Ontology_ClinicalProcedure {

    part def ClinicalProcedure {
        attribute name : String;
        attribute procedureCode : String;
    }

    part def OperativeStep {
        attribute stepIndex : Integer;
        attribute description : String;
    }

    part def SurgicalInstrument {
        attribute instrumentClass : String;
        attribute isSterile : Boolean;
    }

    part def ProcedurePhase {
        attribute phaseName : String;
        attribute phaseOrder : Integer;
    }

    part def TimeConstraint {
        attribute maxDuration : Real;
        attribute timeout : Real;
    }

    connection def UsedIn {
        end instrument : SurgicalInstrument [1];
        end step : OperativeStep [1];
    }

    connection def ConstrainedBy {
        end subject[1];
        end constraint : TimeConstraint [1];
    }

    connection def Precedes {
        end before : OperativeStep [1];
        end after : OperativeStep [1];
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
