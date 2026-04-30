package memo::architecture::functions {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;
    part def LogicalFunction :> ArchitectureElement { attribute functionCategory : String; attribute trigger : String; attribute outputSummary : String; attribute concernKind : ConcernKind; attribute criticality : CriticalityKind; }
    part def LogicalFlow :> ArchitectureElement { attribute flowKind : FlowKind; attribute direction : DirectionKind; attribute latencyBudgetMs : Real; attribute staleAfterMs : Real; attribute integrityLevel : String; }
    part def DataDefinition :> ExchangeItem { attribute confidentialityClass : String; attribute integrityClass : String; attribute availabilityClass : String; }
    part def ControlDefinition :> ExchangeItem { attribute controlType : String; attribute timeoutMs : Real; attribute retryPolicy : String; }
}
