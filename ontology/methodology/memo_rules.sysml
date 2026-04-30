package memo::methodology::rules {
    private import memo::core::common::*;
    private import memo::core::enumerations::*;

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
