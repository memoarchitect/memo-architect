package MEMO_Extension_Physical_Advanced {

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
