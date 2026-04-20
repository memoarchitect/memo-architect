package MEMO_Ontology_MedicalArch_System {

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

    // ─── System families (folded from ontology-extensions/logical-advanced) ──
    part def SystemOfSystems :> System {
        attribute memberSystems : String;
        attribute integrationPattern : String;
    }

    part def SystemExternal :> System {
        attribute externalInterfaceProtocol : String;
        attribute integrationContract : String;
    }
}
