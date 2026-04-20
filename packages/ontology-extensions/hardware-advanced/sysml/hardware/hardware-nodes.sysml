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
        attribute deviceType : String;      // §4.5.5 — "MCU" | "FPGA" | "SoC" | "SBC" | "Server" | "Edge"
    }

    // §4.5.5 — FPGA-specific attributes distinguish it structurally.
    part def FPGA :> ComputingDevice {
        attribute fabric : String;          // e.g. "Xilinx 7-series"
        attribute logicCells : Integer;
    }

    // §4.5.5 — microcontroller-specific power and interface metadata.
    part def Microcontroller :> ComputingDevice {
        attribute mcuFamily : String;       // e.g. "STM32H7"
        attribute powerMode : String;       // "active" | "low-power" | "sleep"
    }

    // §4.5.5 — SBC form-factor metadata.
    part def SingleBoardComputer :> ComputingDevice {
        attribute formFactor : String;      // "Pi-4" | "BeagleBone" | "Jetson"
        attribute peripherals : String;
    }
}
