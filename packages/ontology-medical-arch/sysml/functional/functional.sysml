package MEMO_Ontology_MedicalArch_Functional {

    enum def FunctionScope {
        enum Mission;
        enum System;
        enum Component;
    }

    action def Function {
        attribute name : String;
        attribute scope : FunctionScope;
    }

    action def Scenario {
        attribute name : String;
        attribute scenarioType : String;
    }

    action def UseCase {
        attribute name : String;
        attribute status : String;
    }
}
