package MEMO_Ontology_Arch_Hardware {

    part def HardwareComponent {
        attribute name : String;
        attribute componentId : String;
        attribute manufacturer : String;
        attribute partNumber : String;
        attribute appliedPartType : String;
    }

    part def HardwareAssembly :> HardwareComponent {
        attribute assemblyId : String;
        attribute configurationState : String;
    }

    part def HardwareBoard :> HardwareComponent {
        attribute formFactor : String;
        attribute ipxxRating : String;
        attribute sterilizationMethod : String;
    }

    part def HardwarePart :> HardwareComponent {
        attribute material : String;
        attribute tolerance : String;
        attribute weight : String;
    }

    part def Processor :> HardwareComponent {
        attribute architecture : String;
        attribute clockSpeed : String;
        attribute numberOfCores : Integer;
    }
}
