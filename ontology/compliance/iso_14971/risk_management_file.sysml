package memo {
    package compliance {
        package iso14971 {
            private import memo::core::common::*;
            private import memo::core::enumerations::*;

            doc /* ISO 14971 Risk Management File — the top-level deliverable
                   that aggregates all risk management artifacts required by
                   ISO 14971:2019 clause 4.5. */
            part def RiskManagementFile specializes TraceableElement {
                attribute standard : String;
                attribute clause : String;
                attribute edition : String;
                attribute completenessStatus : String;
            }
        }
    }
}
