package memo {
    package architecture {
        package functions {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;
            part def LogicalFunction specializes ArchitectureElement { attribute functionCategory : String; attribute trigger : String; attribute outputSummary : String; attribute concernKind : ConcernKind; attribute criticality : CriticalityKind; }
            part def LogicalFlow specializes ArchitectureElement { attribute flowKind : FlowKind; attribute direction : DirectionKind; attribute latencyBudgetMs : Real; attribute staleAfterMs : Real; attribute integrityLevel : String; }
            part def DataDefinition specializes ExchangeItem { attribute confidentialityClass : String; attribute integrityClass : String; attribute availabilityClass : String; }
            part def ControlDefinition specializes ExchangeItem { attribute controlType : String; attribute timeoutMs : Real; attribute retryPolicy : String; }
        }
    }
}
