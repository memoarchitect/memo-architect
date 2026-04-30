package md::views::core {
    private import md::core::common::*;
    private import md::core::enumerations::*;
    private import md::core::relationships::*;
    private import md::viewpoints::core::*;

    part def ViewSelectionQuery :> TraceableElement {
        attribute includeElementKinds : String[*];
        attribute includeRelationshipKinds : String[*];
        attribute includeLayers : String[*];
        attribute includeConcerns : ConcernKind[*];
        attribute includeStatusTags : String[*];
        attribute selectionExpression : String;
        attribute rationaleText : String;
    }

    part def View :> DocumentedElement {
        attribute outputKind : ViewOutputKind[*];
        attribute presentationKind : PresentationKind[*];
        attribute filterExpression : String;
        attribute queryDescription : String;
        attribute dataSourceDescription : String;
        attribute autoPopulate : Boolean;
        part viewpoint : Viewpoint;
        ref subject : TraceableElement[*];
        ref exposesElement : TraceableElement[*];
        ref exposesRelationship : SemanticLink[*];
        part selectionQuery : ViewSelectionQuery[*];
    }

    part def DiagramView :> View {
        attribute diagramType : String;
        attribute layoutHint : String;
        attribute styleHint : String;
    }

    part def DocumentBackedView :> View {
        attribute version : String;
        attribute lifecycleState : LifecycleStateKind;
        attribute generationRule : String;
        attribute marketScope : String;
    }

    part def ViewInclusionRule :> TraceableElement {
        attribute includeElementKinds : String[*];
        attribute includeRelationshipKinds : String[*];
        attribute includeLayers : String[*];
        attribute includeConcerns : ConcernKind[*];
        attribute selectionExpression : String;
        attribute rationaleText : String;
    }
}
