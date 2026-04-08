package MEMO_Extension_Operational_Advanced {

    part def Mission {
        attribute name : String;
        attribute objective : String;
    }

    part def Context :> OperationalEntity { }

    part def Substance :> OperationalEntity {
        attribute state : String;
    }

    part def Observable :> OperationalEntity {
        attribute measureType : String;
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
