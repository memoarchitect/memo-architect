package MEMO_Ontology_Core_Hardware {

    part def HardwareComponent {
        attribute name : String;
        attribute manufacturer : String;
        attribute weight : String;
    }

    // Compatibility alias during Physical -> Hardware migration.
    part def PhysicalComponent :> HardwareComponent { }

    part def ElectricalComponent :> HardwareComponent {
        attribute voltageRating : String;
    }

    part def MechanicalComponent :> HardwareComponent { }

    part def Processor :> HardwareComponent {
        attribute architecture : String;
        attribute clockSpeed : String;
    }

    part def Bus :> HardwareComponent {
        attribute protocol : String;
        attribute bandwidth : String;
    }

    part def DeploymentNode :> HardwareComponent {
        attribute location : String;
        attribute environment : String;
    }
}
