package memo::core::common {
    private import memo::core::enumerations::*;

    part def IdentifiedElement {
        attribute id : String;
        attribute name : String;
        attribute description : String;
    }

    part def TraceableElement :> IdentifiedElement {
        attribute rationale : String;
        attribute sourceReference : String;
    }

    part def DocumentedElement :> TraceableElement {
        attribute title : String;
        attribute shortDescription : String;
        attribute longDescription : String;
        attribute documentUsage : String[*];
        attribute sectionIdentifier : String;
    }

    part def RequirementDriver :> TraceableElement;
    part def VerifiableElement :> TraceableElement;
    part def ArchitectureElement :> TraceableElement;
    part def InterfaceElement :> TraceableElement;
    part def EvidenceElement :> TraceableElement;

    part def ExchangeItem :> TraceableElement {
        attribute semantics : String;
        attribute unit : String;
        attribute minValue : String;
        attribute maxValue : String;
        attribute encoding : String;
        attribute timestampRequired : Boolean;
    }

    part def LayerElement :> TraceableElement {
        attribute layerName : String;
    }
}
