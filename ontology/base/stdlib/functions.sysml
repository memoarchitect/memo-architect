// Re-export-only wrapper per ADR-1-13. No new types.
package memo {
    package base {
        package stdlib {
            package functions {
                public import BaseFunctions::*;
            }
        }
    }
}
