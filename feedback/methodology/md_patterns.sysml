package md::methodology::patterns {
    private import md::core::common::*;
    private import md::core::enumerations::*;

    part def ModelingPattern :> TraceableElement {
        attribute intent : String;
        attribute stage : WorkflowStageKind;
        attribute strength : RuleStrengthKind;
    }
}
