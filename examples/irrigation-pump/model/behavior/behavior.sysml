package IrrigationPump_Behavior {
    import MEMO_Ontology_Arch::*;
    import MEMO_Ontology_Process::*;

    action ucPrimeCassette : UseCase {
        attribute redefines name = "Prime Disposable Cassette";
        attribute redefines status = "Operational";
    }

    action ucDeliverIrrigation : UseCase {
        attribute redefines name = "Deliver Surgical Irrigation";
        attribute redefines status = "Operational";
    }

    action ucRespondToReservoirAlarm : UseCase {
        attribute redefines name = "Respond To Reservoir Alarm";
        attribute redefines status = "Operational";
    }

    action primeCassetteScenario : Scenario {
        attribute redefines name = "Cassette priming workflow";
        attribute redefines scenarioType = "Setup";
    }

    action arthroscopyIrrigationScenario : Scenario {
        attribute redefines name = "Arthroscopy irrigation pressure control";
        attribute redefines scenarioType = "Operation";
    }

    action reservoirAlarmScenario : Scenario {
        attribute redefines name = "Reservoir depletion alarm response";
        attribute redefines scenarioType = "Alarm";
    }

    action sfPrimeFluidPath : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Prime Fluid Path";
    }

    action sfRegulatePressure : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Regulate Irrigation Pressure";
    }

    action sfEstimateReservoirVolume : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Estimate Reservoir Volume";
    }

    action sfManageAlarms : Function {
        attribute redefines scope = FunctionScope::System;
        attribute redefines name = "Manage Irrigation Alarms";
    }

    connection : Refines connect refined ::> ucPrimeCassette to refiner ::> primeCassetteScenario;
    connection : Refines connect refined ::> ucDeliverIrrigation to refiner ::> arthroscopyIrrigationScenario;
    connection : Refines connect refined ::> ucRespondToReservoirAlarm to refiner ::> reservoirAlarmScenario;
}
