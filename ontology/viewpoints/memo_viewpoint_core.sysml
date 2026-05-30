package memo {
    package viewpoints {
        package core {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;

            part def Viewpoint specializes DocumentedElement {
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

            part def ViewRule specializes TraceableElement {
                attribute elementTypeName : String;
                attribute relationTypeName : String;
                attribute strength : RuleStrengthKind;
                attribute rationaleText : String;
            }
        }
    }
}
