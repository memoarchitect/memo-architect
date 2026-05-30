package memo {
    package examples {
        package gpca {
            package methodology {
                private import memo::methodology::profiles::*;
                private import memo::methodology::gpca::profiles::*;
                private import memo::core::relationships::*;
                private import memo::examples::gpca::requirements::*;
                private import memo::examples::gpca::architecture::*;

                part gpcaResolvedMethodologyBinding : MethodologyBindingLink {
                    attribute id = "MLINK-001";
                    attribute name = "GPCAUsesGPCAMethodology";
                    attribute linkStatus = LinkStatusKind::active;
                    part boundModelElement = tlm;
                    part resolvedMethodology = gpcaMethodResolved;
                }
            }
        }
    }
}
