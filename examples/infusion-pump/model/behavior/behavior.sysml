package InfusionPump_Behavior {

    import MEMO_Ontology_Arch::*;
    import MEMO_Ontology_Process::*;
    import InfusionPump::*;
    import InfusionPump_Risk::*;

    // --- Action Definitions (reusable process templates) ---

    action def ReceivePrescription {
        out prescription : PrescriptionData;
    }

    action def ValidatePrescription {
        in prescription : PrescriptionData;
        out validatedOrder : InfusionOrder;
        out validationError : ErrorCode;
    }

    action def PreparePump {
        in order : InfusionOrder;
        out pumpReady : ReadySignal;
    }

    action def DeliverInfusion {
        in pumpReady : ReadySignal;
        in order : InfusionOrder;
        out infusionStatus : StatusReport;
    }

    action def MonitorPatient {
        in infusionStatus : StatusReport;
        out vitalSigns : PatientVitals;
        out alarm : AlarmSignal;
    }

    action def HandleAlarm {
        in alarm : AlarmSignal;
        out response : ClinicalResponse;
    }

    // --- Top-level action (the overall process) ---

    action performInfusion {

        action receive : ReceivePrescription;
        action validate : ValidatePrescription;
        action prepare : PreparePump;
        action deliver : DeliverInfusion;
        action monitor : MonitorPatient;
        action handleAlarm : HandleAlarm;

        // Flows — what moves between actions
        flow of PrescriptionData from receive.prescription to validate.prescription;
        flow of InfusionOrder from validate.validatedOrder to prepare.order;
        flow of InfusionOrder from validate.validatedOrder to deliver.order;
        flow of ReadySignal from prepare.pumpReady to deliver.pumpReady;
        flow of StatusReport from deliver.infusionStatus to monitor.infusionStatus;
        flow of AlarmSignal from monitor.alarm to handleAlarm.alarm;

        // Succession — temporal ordering
        first start then receive then validate then prepare then deliver then done;
        first deliver then monitor;
        first monitor then handleAlarm;
    }

    // --- Allocations (function → structure) ---

    allocate validate to SoftwareSubsystem;
    allocate prepare to PumpMechanism;
    allocate deliver to PumpMechanism;
    allocate monitor to SensorSubsystem;
    allocate handleAlarm to SoftwareSubsystem;
}
