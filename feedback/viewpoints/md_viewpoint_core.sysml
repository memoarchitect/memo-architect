package md::viewpoints::core {
    private import md::core::common::*;
    private import md::core::enumerations::*;

    part def Viewpoint :> DocumentedElement {
        attribute purpose : String;
        attribute audience : AudienceKind[*];
        attribute stage : WorkflowStageKind;
        attribute abstractionLevel : String;
        attribute outputKind : ViewOutputKind[*];
        attribute presentationKind : PresentationKind[*];
        attribute concern : ConcernKind[*];
        attribute includedLayers : String[*];
        attribute allowedElementKinds : String[*];
        attribute allowedRelationshipKinds : String[*];
        attribute filterExpression : String;
        attribute methodologyReference : String[*];
        attribute extendsViewpointIds : String[*];
        attribute userExtensible : Boolean;
    }

    part def ViewRule :> TraceableElement {
        attribute elementTypeName : String;
        attribute relationTypeName : String;
        attribute strength : RuleStrengthKind;
        attribute rationaleText : String;
    }
}
