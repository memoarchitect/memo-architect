package MEMO_Ontology_Medical_RiskAnalysis {

    enum def FaultTreeGateType {
        enum And;
        enum Or;
        enum PriorityAnd;
        enum Inhibit;
    }

    part def FailureAnalysis {
        attribute title : String;
    }

    part def FailureModesAndEffectsAnalysis :> FailureAnalysis { }

    part def FaultTreeAnalysis :> FailureAnalysis { }

    requirement def FailureMode {
        attribute failureModeId : String;
        attribute title : String;
    }

    requirement def FailureCause {
        attribute causeId : String;
        attribute title : String;
    }

    requirement def FailureEffect {
        attribute effectId : String;
        attribute title : String;
    }

    requirement def DetectionControl :> RiskControl { }

    requirement def TopEvent {
        attribute eventId : String;
        attribute title : String;
    }

    requirement def IntermediateEvent {
        attribute eventId : String;
        attribute title : String;
    }

    requirement def BasicEvent {
        attribute eventId : String;
        attribute title : String;
    }

    part def FaultTreeGate {
        attribute name : String;
        attribute gateType : FaultTreeGateType;
    }
}
