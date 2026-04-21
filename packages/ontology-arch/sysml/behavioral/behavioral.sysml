package MEMO_Ontology_Arch_Behavioral {

    part def Scenario {
        attribute scenarioId : String;
        attribute title : String;
        attribute precondition : String;
        attribute postcondition : String;
    }

    action def Action {
        attribute name : String;
        attribute duration : String;
    }

    action def ClinicalAction :> Action {
        attribute clinicalContext : String;
        attribute appliedPartType : String;
    }

    part def StateMachine {
        attribute name : String;
        attribute context : String;
    }

    part def State {
        attribute name : String;
        attribute isInitial : Boolean;
        attribute isFinal : Boolean;
        attribute invariant : String;
    }

    connection def Transition {
        end source : State [1];
        end target : State [1];
        attribute trigger : String;
        attribute guard : String;
        attribute effect : String;
    }

    part def Event {
        attribute name : String;
        attribute eventType : String;
    }
}
