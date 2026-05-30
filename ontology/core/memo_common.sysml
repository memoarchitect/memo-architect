package memo {
    package core {
        package common {
            private import memo::core::enumerations::*;

            part def IdentifiedElement {
                attribute id : String;
                attribute name : String;
                attribute description : String;
            }

            part def TraceableElement specializes IdentifiedElement {
                attribute rationale : String;
                attribute sourceReference : String;
            }

            part def DocumentedElement specializes TraceableElement {
                attribute title : String;
                attribute shortDescription : String;
                attribute longDescription : String;
                attribute documentUsage : String[*];
                attribute sectionIdentifier : String;
            }

            part def RequirementDriver specializes TraceableElement;
            part def VerifiableElement specializes TraceableElement;
            part def ArchitectureElement specializes TraceableElement;
            part def InterfaceElement specializes TraceableElement;
            part def EvidenceElement specializes TraceableElement;

            part def ExchangeItem specializes TraceableElement {
                attribute semantics : String;
                attribute unit : String;
                attribute minValue : String;
                attribute maxValue : String;
                attribute encoding : String;
                attribute timestampRequired : Boolean;
            }

            part def LayerElement specializes TraceableElement {
                attribute layerName : String;
            }

            part def Citation specializes IdentifiedElement {
                attribute source : String;
                attribute section : String;
                attribute uri : String;
                attribute year : String;
            }
        }
    }
}
