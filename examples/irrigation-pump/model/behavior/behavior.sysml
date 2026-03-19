package IrrigationPump_Behavior {

    // --- Action Definitions ---

    action def SenseSoilMoisture {
        out moistureLevel : MoistureReading;
    }

    action def EvaluateIrrigationNeed {
        in moistureLevel : MoistureReading;
        in weatherForecast : WeatherData;
        out irrigationDecision : IrrigationCommand;
    }

    action def ActivatePump {
        in command : IrrigationCommand;
        out waterFlow : WaterFlowRate;
        out pumpStatus : PumpStatus;
    }

    action def DistributeWater {
        in waterFlow : WaterFlowRate;
        out zoneDelivery : ZoneWaterVolume;
    }

    action def MonitorWaterUsage {
        in zoneDelivery : ZoneWaterVolume;
        in pumpStatus : PumpStatus;
        out usageReport : UsageReport;
        out leakAlert : LeakAlarm;
    }

    action def HandleFault {
        in leakAlert : LeakAlarm;
        out shutdownCommand : ShutdownSignal;
    }

    action def FetchWeather {
        out weatherForecast : WeatherData;
    }

    // --- Top-level irrigation cycle ---

    action irrigationCycle {

        action sense : SenseSoilMoisture;
        action fetchWeather : FetchWeather;
        action evaluate : EvaluateIrrigationNeed;
        action activate : ActivatePump;
        action distribute : DistributeWater;
        action monitorUsage : MonitorWaterUsage;
        action handleFault : HandleFault;

        // Flows — material (water), information (signals/data)
        flow of MoistureReading from sense.moistureLevel to evaluate.moistureLevel;
        flow of WeatherData from fetchWeather.weatherForecast to evaluate.weatherForecast;
        flow of IrrigationCommand from evaluate.irrigationDecision to activate.command;
        flow of WaterFlowRate from activate.waterFlow to distribute.waterFlow;
        flow of ZoneWaterVolume from distribute.zoneDelivery to monitorUsage.zoneDelivery;
        flow of PumpStatus from activate.pumpStatus to monitorUsage.pumpStatus;
        flow of LeakAlarm from monitorUsage.leakAlert to handleFault.leakAlert;

        // Succession — sense and fetch run in parallel, then evaluate
        first start then sense;
        first start then fetchWeather;
        first sense then evaluate;
        first fetchWeather then evaluate;
        first evaluate then activate then distribute then done;
        first distribute then monitorUsage;
        first monitorUsage then handleFault;
    }

    // --- Allocations (function → structure) ---

    allocate sense to SoilSensorArray;
    allocate fetchWeather to CommunicationsModule;
    allocate evaluate to ControlUnit;
    allocate activate to PumpMotorAssembly;
    allocate distribute to ValveManifold;
    allocate monitorUsage to ControlUnit;
    allocate handleFault to ControlUnit;
}
