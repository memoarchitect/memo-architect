package md::methodology::workflow {
    private import md::core::common::*;
    private import md::core::enumerations::*;

    part def WorkflowStep :> TraceableElement {
        attribute stepOrder : Integer;
        attribute stage : WorkflowStageKind;
        attribute objective : String;
        attribute entryCriteria : String;
        attribute exitCriteria : String;
    }
}
