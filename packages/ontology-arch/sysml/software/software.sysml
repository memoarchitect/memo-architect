package MEMO_Ontology_Arch_Software {

    part def SoftwareComponent {
        attribute name : String;
        attribute componentId : String;
        attribute version : String;
        attribute safetyClass : String;
        attribute isSOUP : Boolean;
    }

    part def SoftwareInterface :> SoftwareComponent {
        attribute protocol : String;
        attribute apiVersion : String;
    }

    part def ExecutionThread :> SoftwareComponent {
        attribute priority : Integer;
        attribute period : String;
        attribute wcet : String;
    }

    part def SoftwareModule :> SoftwareComponent {
        attribute moduleType : String;
        attribute language : String;
    }
}
