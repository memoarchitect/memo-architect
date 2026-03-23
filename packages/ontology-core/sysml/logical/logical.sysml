package MEMO_Ontology_Core_Logical {

    part def System {
        attribute name : String;
    }

    part def SystemOfSystems :> System { }

    part def SystemExternal :> System { }

    part def Subsystem {
        attribute name : String;
    }

    part def LogicalComponent {
        attribute name : String;
        attribute level : String;
    }

    part def ArchitectureDecision {
        attribute name : String;
    }

    part def ArchitectureRationale {
        attribute name : String;
    }

    part def QualityAttribute {
        attribute name : String;
    }

    part def Question {
        attribute name : String;
    }
}
