package memo {
    package methodology {
        package rules {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;
            private import memo::base::rules::*;

            part def ElementUsageRule :> ConsistencyRule {
                attribute elementTypeName : String;
            }

            part def RelationUsageRule :> ConsistencyRule {
                attribute relationTypeName : String;
            }
        }
    }
}
