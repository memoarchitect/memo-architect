// Semantic-metadata definitions (SysML v2 `metadata def`) — the standard, portable
// mechanism for extending the MEMO ontology with domain semantics. Downstream models
// extend MEMO by importing the ontology library and either specializing its kinds or
// applying these metadata defs with `@Name` — never by adding new grammar.
package memo {
    package base {
        package semantics {
            // Tags an element with the regulatory standard it derives from
            // (e.g. ISO 14971, IEC 62304, ISO/IEC/IEEE 42010).
            metadata def StandardReference {
                attribute standard : String;
                attribute clause : String;
            }

            // Marks an element as the rationale/provenance carrier for a decision.
            metadata def Provenance {
                attribute source : String;
                attribute rationale : String;
            }
        }
    }
}
