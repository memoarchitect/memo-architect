package memo::examples::gpca::methodology {
    private import memo::methodology::profiles::*;
    private import memo::core::relationships::*;
    private import memo::examples::gpca::requirements::*;
    private import memo::examples::gpca::architecture::*;

    part gpcaResolvedMethodologyBinding : MethodologyBindingLink {
        attribute id = "MLINK-001";
        attribute name = "GPCAUsesLightDefaultMethodology";
        attribute linkStatus = LinkStatusKind::active;
        part boundModelElement = tlm;
        part resolvedMethodology = mdLightDefaultResolved;
    }
}
