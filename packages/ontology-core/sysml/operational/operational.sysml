package MEMO_Ontology_Core_Operational {

    part def Mission {
        attribute name : String;
        attribute objective : String;
    }

    part def Context :> OperationalEntity { }

    part def OperationalActor {
        attribute name : String;
        attribute role : String;
    }

    part def OperationalEntity {
        attribute name : String;
        attribute category : String;
    }

    part def OperationalEnvironment :> Context {
        attribute setting : String;
    }

    part def Resource :> OperationalEntity { }

    part def Substance :> OperationalEntity {
        attribute state : String;
    }

    part def Observable :> OperationalEntity {
        attribute measureType : String;
    }

    action def OperationalActivity {
        attribute name : String;
        attribute level : String;
    }

    action def Operation :> OperationalActivity { }

    action def Procedure :> Operation {
        attribute objective : String;
    }

    action def OperationalScenario {
        attribute name : String;
        attribute scenarioType : String;
    }

    action def MissionPhase {
        attribute name : String;
        attribute order : Integer;
    }
}
