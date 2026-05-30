// Consistency rule base types per Epic N.
// Bare imports (no `private`) per ADR-1-16 fallback.
package memo {
    package base {
        package rules {
            import memo::core::common::*;
            import memo::core::enumerations::*;

            part def ConsistencyRule specializes TraceableElement {
                attribute appliesTo : String;
                attribute predicate : RulePredicateKind;
                attribute strength : RuleStrengthKind;
                attribute severity : RuleSeverityKind;
                attribute rationaleText : String;
                attribute category : RuleCategoryKind;
            }

            part def RelationshipConsistencyRule specializes ConsistencyRule {
                attribute relationshipType : String;
                attribute minCount : String;
                attribute maxCount : String;
                attribute direction : String;
                attribute relatedKinds : String;
            }

            part def AttributeConsistencyRule specializes ConsistencyRule {
                attribute targetAttribute : String;
            }

            part def ConditionalConsistencyRule specializes RelationshipConsistencyRule {
                attribute conditionAttribute : String;
                attribute conditionOperator : String;
                attribute conditionValues : String;
            }

            part def CoverageConsistencyRule specializes ConsistencyRule {
                attribute standard : String;
                attribute clause : String;
                attribute coverageTarget : String;
            }
        }
    }
}
