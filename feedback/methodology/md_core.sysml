package md::methodology::core {
    private import md::core::common::*;
    private import md::core::enumerations::*;

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
}
