package md::methodology::rules {
    private import md::core::common::*;
    private import md::core::enumerations::*;

    part def ElementUsageRule :> TraceableElement {
        attribute elementTypeName : String;
        attribute strength : RuleStrengthKind;
        attribute rationaleText : String;
    }

    part def RelationUsageRule :> TraceableElement {
        attribute relationTypeName : String;
        attribute strength : RuleStrengthKind;
        attribute rationaleText : String;
    }
}
