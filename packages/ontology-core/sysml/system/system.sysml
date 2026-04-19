package MEMO_Ontology_Core_System {

    part def System {
        attribute name : String;
    }

    part def Subsystem :> System {
        attribute boundary : String;
    }

    part def SystemOfInterest :> System {
        attribute missionScope : String;
    }

    part def SystemBoundary {
        attribute boundaryId : String;
        attribute definition : String;
    }

    part def ExternalSystem :> System {
        attribute interactionMode : String;
    }

    part def SystemActor :> OperationalActor {
        attribute systemRole : String;
    }
}
