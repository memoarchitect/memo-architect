package IrrigationPump_Architecture {
    import MEMO_Ontology_Medical::*;
    import IrrigationPump_Requirements::*;
    import IrrigationPump_Behavior::*;

    part irrigationConsole : Subsystem {
        attribute redefines name = "Surgical Irrigation Console";
    }

    part perioperativeIntegrationEnvironment : SystemOfSystems {
        attribute redefines name = "Perioperative Integration Environment";
    }

    part hospitalAlarmRouter : SystemExternal {
        attribute redefines name = "Hospital Alarm Router";
    }

    part perioperativeDocumentationSystem : SystemExternal {
        attribute redefines name = "Perioperative Documentation System";
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

    port consoleIntegrationEndpoint : DataEndpoint { }

    port alarmRouterEndpoint : DataEndpoint { }

    port documentationEndpoint : DataEndpoint { }

    interface def AlarmStatusFHIRInterface :> DataInterface { }

    interface def ProcedureStatusFHIRInterface :> DataInterface { }

    interface def HL7FHIRRestProtocol :> CommunicationProtocol { }

    interface def FHIRDeviceObservationProfile :> InteroperabilityProfile { }

    item def AlarmStatusPayload :> EventMessage {
        attribute redefines semanticRole = "alarm-status";
    }

    item def ProcedureSummaryPayload :> StateMessage {
        attribute redefines semanticRole = "procedure-summary";
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
    connection : ParticipatesInSystemOfSystems connect system ::> irrigationConsole to systemOfSystems ::> perioperativeIntegrationEnvironment;
    connection : ParticipatesInSystemOfSystems connect system ::> hospitalAlarmRouter to systemOfSystems ::> perioperativeIntegrationEnvironment;
    connection : ParticipatesInSystemOfSystems connect system ::> perioperativeDocumentationSystem to systemOfSystems ::> perioperativeIntegrationEnvironment;
    connection : ExposesInterface connect provider ::> irrigationConsole to dataInterface ::> AlarmStatusFHIRInterface;
    connection : ExposesInterface connect provider ::> hospitalAlarmRouter to dataInterface ::> AlarmStatusFHIRInterface;
    connection : ExposesInterface connect provider ::> irrigationConsole to dataInterface ::> ProcedureStatusFHIRInterface;
    connection : ExposesInterface connect provider ::> perioperativeDocumentationSystem to dataInterface ::> ProcedureStatusFHIRInterface;
    connection : HasEndpoint connect dataInterface ::> AlarmStatusFHIRInterface to endpoint ::> consoleIntegrationEndpoint;
    connection : HasEndpoint connect dataInterface ::> AlarmStatusFHIRInterface to endpoint ::> alarmRouterEndpoint;
    connection : HasEndpoint connect dataInterface ::> ProcedureStatusFHIRInterface to endpoint ::> consoleIntegrationEndpoint;
    connection : HasEndpoint connect dataInterface ::> ProcedureStatusFHIRInterface to endpoint ::> documentationEndpoint;
    connection : ImplementsProtocol connect subject ::> AlarmStatusFHIRInterface to protocol ::> HL7FHIRRestProtocol;
    connection : ImplementsProtocol connect subject ::> ProcedureStatusFHIRInterface to protocol ::> HL7FHIRRestProtocol;
    connection : ConformsToProfile connect subject ::> AlarmStatusFHIRInterface to profile ::> FHIRDeviceObservationProfile;
    connection : ConformsToProfile connect subject ::> ProcedureStatusFHIRInterface to profile ::> FHIRDeviceObservationProfile;
    connection : CarriesExchangeItem connect dataInterface ::> AlarmStatusFHIRInterface to exchangeItem ::> AlarmStatusPayload;
    connection : CarriesExchangeItem connect dataInterface ::> ProcedureStatusFHIRInterface to exchangeItem ::> ProcedureSummaryPayload;

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
