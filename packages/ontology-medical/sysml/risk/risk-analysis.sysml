package MEMO_Ontology_Medical_RiskAnalysis {

    enum def FaultTreeGateType {
        enum And;
        enum Or;
        enum PriorityAnd;
        enum Inhibit;
    }

    part def FailureModesAndEffectsAnalysis {
        attribute title : String;
    }

    part def FaultTreeAnalysis {
        attribute title : String;
    }

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

    requirement def TopEvent {
        attribute eventId : String;
        attribute title : String;
    }

    requirement def FaultTreeContributor {
        attribute eventId : String;
        attribute title : String;
    }

    part def FaultTreeGate {
        attribute name : String;
        attribute gateType : FaultTreeGateType;
    }
}
