package IrrigationPump {

    // --- Part Definitions ---

    part def IrrigationSystem;
    part def ControlUnit;
    part def PumpMotorAssembly;
    part def ValveManifold;
    part def SoilSensorArray;
    part def CommunicationsModule;
    part def PowerSupply;
    part def IrrigationZone;

    // --- Item Definitions (things that flow) ---

    item def MoistureReading;
    item def WeatherData;
    item def IrrigationCommand;
    item def WaterFlowRate;
    item def ZoneWaterVolume;
    item def PumpStatus;
    item def UsageReport;
    item def LeakAlarm;
    item def ShutdownSignal;

    // --- System Decomposition ---

    part irrigationSystem : IrrigationSystem {
        part controlUnit : ControlUnit;
        part pump : PumpMotorAssembly;
        part valves : ValveManifold;
        part sensors : SoilSensorArray;
        part comms : CommunicationsModule;
        part power : PowerSupply;
        part zoneA : IrrigationZone;
        part zoneB : IrrigationZone;
    }

    // --- Connections ---

    connection sensorsToControl : SoilSensorArray connect sensors to controlUnit;
    connection commsToControl : CommunicationsModule connect comms to controlUnit;
    connection controlToPump : ControlUnit connect controlUnit to pump;
    connection pumpToValves : PumpMotorAssembly connect pump to valves;
    connection powerToAll : PowerSupply connect power to pump;
}
