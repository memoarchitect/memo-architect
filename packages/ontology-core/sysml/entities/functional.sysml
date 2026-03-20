package MEMO_Ontology_Core_Functional {

    action def SystemFunction {
        attribute name : String;
        attribute level : String;
    }

    action def ComponentFunction {
        attribute name : String;
        attribute level : String;
    }

    action def Scenario {
        attribute name : String;
        attribute scenarioType : String;
    }

    part def UseCase {
        attribute name : String;
        attribute status : String;
    }
}
