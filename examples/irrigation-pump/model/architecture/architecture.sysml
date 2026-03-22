package IrrigationPump_Architecture {
    import MEMO_Ontology_Medical::*;
    import IrrigationPump_Requirements::*;
    import IrrigationPump_Behavior::*;

    part irrigationConsole : Subsystem {
        attribute redefines name = "Surgical Irrigation Console";
    }

    part fluidPathSubsystem : LogicalComponent {
        attribute redefines name = "Fluid Path Subsystem";
    }

    part sensingSubsystem : LogicalComponent {
        attribute redefines name = "Pressure and Reservoir Sensing Subsystem";
    }

    part alarmSubsystem : LogicalComponent {
        attribute redefines name = "Alarm Subsystem";
    }

    part uiSubsystem : LogicalComponent {
        attribute redefines name = "Touchscreen UI Subsystem";
    }

    part disposableCassette : MechanicalComponent {
        attribute redefines name = "Disposable Cassette";
    }

    part pumpHead : MechanicalComponent {
        attribute redefines name = "Peristaltic Pump Head";
    }

    part pressureSensorBoard : ElectricalComponent {
        attribute redefines name = "Pressure Sensor Board";
    }

    part reservoirScale : PhysicalComponent {
        attribute redefines name = "Reservoir Hook Scale";
    }

    part footswitchPedal : PhysicalComponent {
        attribute redefines name = "Footswitch Pedal";
    }

    part irrigationControlSoftware : Software {
        attribute redefines name = "Irrigation Control Software";
        attribute redefines safetyClassification = "C";
    }

    part pressureControlModule : SoftwareComponent {
        attribute redefines name = "Pressure Control Module";
        attribute redefines safetyClassification = "C";
    }

    part reservoirEstimationModule : SoftwareComponent {
        attribute redefines name = "Reservoir Estimation Module";
        attribute redefines safetyClassification = "B";
    }

    part alarmCoordinatorModule : SoftwareComponent {
        attribute redefines name = "Alarm Coordinator Module";
        attribute redefines safetyClassification = "B";
    }

    part setupScreen : UIScreen {
        attribute redefines name = "Setup Screen";
    }

    part alarmBanner : UIPanel {
        attribute redefines name = "Reservoir Alarm Banner";
    }

    part primeConfirmationDialog : UIPanel {
        attribute redefines name = "Prime Confirmation Dialog";
    }

    connection : ComposedOf connect whole ::> irrigationConsole to part ::> fluidPathSubsystem;
    connection : ComposedOf connect whole ::> irrigationConsole to part ::> sensingSubsystem;
    connection : ComposedOf connect whole ::> irrigationConsole to part ::> alarmSubsystem;
    connection : ComposedOf connect whole ::> irrigationConsole to part ::> uiSubsystem;
    connection : ComposedOf connect whole ::> irrigationConsole to part ::> disposableCassette;
    connection : ComposedOf connect whole ::> irrigationConsole to part ::> pumpHead;
    connection : ComposedOf connect whole ::> irrigationConsole to part ::> pressureSensorBoard;
    connection : ComposedOf connect whole ::> irrigationConsole to part ::> reservoirScale;
    connection : ComposedOf connect whole ::> irrigationConsole to part ::> footswitchPedal;

    connection : Satisfy connect satisfiedBy ::> fluidPathSubsystem to satisfies ::> srPressureRegulation;
    connection : Satisfy connect satisfiedBy ::> sensingSubsystem to satisfies ::> srReservoirLowAlarm;
    connection : Satisfy connect satisfiedBy ::> fluidPathSubsystem to satisfies ::> srPrimeInterlock;
    connection : Satisfy connect satisfiedBy ::> alarmSubsystem to satisfies ::> srAlarmAudibility;

    connection : Satisfy connect satisfiedBy ::> pressureControlModule to satisfies ::> swrPressureControlLoop;
    connection : Satisfy connect satisfiedBy ::> reservoirEstimationModule to satisfies ::> swrReservoirEstimation;
    connection : Satisfy connect satisfiedBy ::> alarmCoordinatorModule to satisfies ::> swrAlarmCoordinator;

    connection : AllocateTo connect function ::> sfPrimeFluidPath to structure ::> fluidPathSubsystem;
    connection : AllocateTo connect function ::> sfRegulatePressure to structure ::> pressureControlModule;
    connection : AllocateTo connect function ::> sfEstimateReservoirVolume to structure ::> reservoirEstimationModule;
    connection : AllocateTo connect function ::> sfManageAlarms to structure ::> alarmCoordinatorModule;
}
