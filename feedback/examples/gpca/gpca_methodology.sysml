package md::examples::gpca::methodology {
    private import md::methodology::profiles::*;
    private import md::core::relationships::*;
    private import md::examples::gpca::requirements::*;
    private import md::examples::gpca::architecture::*;

    part gpcaResolvedMethodologyBinding : MethodologyBindingLink {
        attribute id = "MLINK-001";
        attribute name = "GPCAUsesLightDefaultMethodology";
        attribute linkStatus = LinkStatusKind::active;
        part boundModelElement = tlm;
        part resolvedMethodology = mdLightDefaultResolved;
    }
}
