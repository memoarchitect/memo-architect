package MEMO_Ontology_MedicalArch_Hardware {

    // ─── Generic hardware ───────────────────────────────────────────────────
    part def HardwareComponent {
        attribute name : String;
        attribute manufacturer : String;
        attribute partNumber : String;
        attribute weight : String;
    }

    part def ElectricalComponent :> HardwareComponent {
        attribute voltageRating : String;
        attribute currentRating : String;
    }

    // Mechanical assemblies differ structurally (tolerance + material).
    part def MechanicalComponent :> HardwareComponent {
        attribute material : String;
        attribute tolerance : String;
    }

    // ─── Compute & interconnect ─────────────────────────────────────────────
    part def Processor :> ElectricalComponent {
        attribute architecture : String;
        attribute clockSpeed : String;
    }

    // Microcontroller unit — single-chip compute for embedded medical devices.
    part def MCU :> Processor {
        attribute flashKB : String;
        attribute ramKB : String;
        attribute safetyClass : String;   // e.g. IEC 60601 "BF", "CF"
    }

    // SoC / SBC / PCB-level board that hosts processors, memory, peripherals.
    part def Board :> ElectricalComponent {
        attribute formFactor : String;    // e.g. "PCB", "SoM", "SBC"
        attribute ipxxRating : String;    // ingress protection
    }

    part def Bus :> HardwareComponent {
        attribute protocol : String;      // e.g. "I2C", "SPI", "CAN", "USB"
        attribute bandwidth : String;
    }

    // ─── Sensing & actuation ────────────────────────────────────────────────
    part def Sensor :> ElectricalComponent {
        attribute measurand : String;     // what it measures
        attribute range : String;
        attribute accuracy : String;
        attribute samplingRate : String;
    }

    // Sensor that touches the patient (ECG leads, SpO2 clip, pressure cuff).
    part def PhysiologicalSensor :> Sensor {
        attribute appliedPartType : String;  // IEC 60601 "B" | "BF" | "CF"
        attribute bodyInterface : String;    // e.g. "skin-contact", "invasive"
    }

    part def Actuator :> ElectricalComponent {
        attribute actuationType : String;    // e.g. "motor", "solenoid", "piezo"
        attribute forceRating : String;
    }

    // Actuator that delivers therapy to the patient (pump motor, defib pad, stimulator).
    part def PhysiologicalActuator :> Actuator {
        attribute appliedPartType : String;
        attribute therapyMode : String;
    }

    // ─── Power ──────────────────────────────────────────────────────────────
    part def Battery :> ElectricalComponent {
        attribute chemistry : String;        // e.g. "Li-ion", "NiMH"
        attribute capacityMAh : String;
        attribute rechargeable : Boolean;
    }

    part def PowerSupply :> ElectricalComponent {
        attribute inputVoltage : String;
        attribute outputVoltage : String;
        attribute isolationClass : String;   // IEC 60601 "Class I" | "Class II"
    }

    // ─── Enclosure & physical packaging ─────────────────────────────────────
    part def Enclosure :> MechanicalComponent {
        attribute ipxxRating : String;
        attribute sterilizationMethod : String; // e.g. "EtO", "gamma", "autoclave"
    }

    // ─── Deployment ─────────────────────────────────────────────────────────
    part def DeploymentNode :> HardwareComponent {
        attribute location : String;
        attribute environment : String;
    }

    // ─── Compute nodes (folded from ontology-extensions/hardware-advanced) ──
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
        attribute deviceType : String;
    }

    part def FPGA :> ComputingDevice {
        attribute fabric : String;
        attribute logicCells : Integer;
    }

    part def Microcontroller :> ComputingDevice {
        attribute mcuFamily : String;
        attribute powerMode : String;
    }

    part def SingleBoardComputer :> ComputingDevice {
        attribute formFactor : String;
        attribute peripherals : String;
    }
}
