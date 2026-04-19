package MEMO_Extension_Hardware_Advanced {

    part def HardwareModule {
        attribute name : String;
    }

    part def HardwareNode :> HardwareComponent {
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
