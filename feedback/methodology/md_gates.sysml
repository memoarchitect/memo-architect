package md::methodology::gates {
    private import md::core::common::*;
    private import md::core::enumerations::*;

    part def QualityGate :> TraceableElement {
        attribute gateStage : WorkflowStageKind;
        attribute passCriteria : String;
    }
}
