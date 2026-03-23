package MEMO_Ontology_Core_Functional {

    action def Function {
        attribute name : String;
        attribute level : String;
    }

    action def MissionFunction :> Function { }

    action def SystemFunction :> Function { }

    action def ComponentFunction :> Function { }

    action def Scenario {
        attribute name : String;
        attribute scenarioType : String;
    }

    part def UseCase {
        attribute name : String;
        attribute status : String;
    }
}
