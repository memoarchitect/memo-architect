package MEMO_Ontology_Core_Physical {

    part def PhysicalComponent {
        attribute name : String;
        attribute manufacturer : String;
        attribute weight : String;
    }

    part def ElectricalComponent :> PhysicalComponent {
        attribute voltageRating : String;
    }

    part def MechanicalComponent :> PhysicalComponent { }

    part def PhysicalModule {
        attribute name : String;
    }

    part def HardwareNode :> PhysicalComponent {
        attribute ip : String;
    }

    part def ComputingDevice :> HardwareNode {
        attribute numberOfCores : Integer;
        attribute ram : Integer;
        attribute storage : Integer;
    }

    part def FPGA :> ComputingDevice { }

    part def Microcontroller :> ComputingDevice { }

    part def SingleBoardComputer :> ComputingDevice { }
}
