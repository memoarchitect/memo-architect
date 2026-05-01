package memo::methodology::core {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;

    part def MethodologyLibrary :> TraceableElement {
        attribute version : String;
        attribute domain : String;
        attribute description : String;
    }

    part def MethodologyDefinition :> TraceableElement {
        attribute version : String;
        attribute domain : String;
        attribute description : String;
        attribute baseMethodName : String;
    }

    part def ResolvedMethodology :> TraceableElement {
        attribute version : String;
        attribute rigor : MethodRigorKind;
        attribute resolutionSummary : String;
    }

    part def ProjectMethodBinding :> TraceableElement {
        attribute projectName : String;
    }

    part def DhfDocumentBinding :> TraceableElement {
        attribute documentTitle : String;
        attribute groupLabel : String;
        attribute templateId : String;
        attribute viewKind : String;
        attribute regulatoryReference : String;
        attribute lifecycleStage : WorkflowStageKind;
        attribute required : Boolean;
    }
}
