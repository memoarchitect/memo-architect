package MEMO_Ontology_Core_Operational {

    part def Mission {
        attribute name : String;
        attribute objective : String;
    }

    part def OperationalActor {
        attribute name : String;
        attribute role : String;
    }

    part def OperationalEntity {
        attribute name : String;
        attribute category : String;
    }

    action def OperationalActivity {
        attribute name : String;
        attribute level : String;
    }

    action def OperationalScenario {
        attribute name : String;
        attribute scenarioType : String;
    }

    part def MissionPhase {
        attribute name : String;
        attribute order : Integer;
    }
}
