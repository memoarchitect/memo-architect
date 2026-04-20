package MEMO_Ontology_MedicalArch_Operational {

    part def OperationalActor {
        attribute name : String;
        attribute role : String;
    }

    part def OperationalEntity {
        attribute name : String;
        attribute category : String;
    }

    part def OperationalEnvironment :> OperationalEntity {
        attribute setting : String;
    }

    part def Resource :> OperationalEntity { }

    action def OperationalActivity {
        attribute name : String;
        attribute level : String;
    }

    action def Operation :> OperationalActivity { }

    action def Procedure :> Operation {
        attribute objective : String;
    }

    // ─── Mission context (folded from ontology-extensions/operational-advanced) ──
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
