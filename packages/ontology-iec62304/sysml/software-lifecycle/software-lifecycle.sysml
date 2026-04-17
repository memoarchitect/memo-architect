package MEMO_Ontology_IEC62304_SoftwareLifecycle {

    // ─── IEC 62304 §4 — Software Safety Classification ───────────────────────
    enum def SoftwareSafetyClass {
        enum A;   // No injury or damage to health possible
        enum B;   // Non-serious injury possible
        enum C;   // Death or serious injury possible
    }

    // ─── IEC 62304 §5 — Software Development Process ─────────────────────────

    // The complete software of the medical device — the top-level item.
    // Specialises SoftwareModule: a SoftwareSystem is a cohesive developable unit.
    part def SoftwareSystem :> SoftwareModule {
        attribute safetyClass : SoftwareSafetyClass;
    }

    // A functionally isolated part of the software system (§5.3).
    // Specialises SoftwareModule per SEI module decomposition.
    part def SoftwareItem :> SoftwareModule {
        attribute safetyClass : SoftwareSafetyClass;
    }

    // The smallest unit of software that can be independently tested (§5.5).
    // Specialises SoftwareComponent — it executes and can be tested in isolation.
    part def SoftwareUnit :> SoftwareComponent {
        attribute safetyClass : SoftwareSafetyClass;
    }

    // ─── IEC 62304 §8 — SOUP (Software Of Unknown Provenance) ────────────────
    // Third-party or legacy software incorporated without full SDL compliance.
    part def SOUPItem :> SoftwareModule {
        attribute SOUPVersion : String;
        attribute SOUPSupplier : String;
        attribute anomalyListReviewed : Boolean;
    }

    // ─── IEC 62304 §6 — Maintenance ──────────────────────────────────────────
    part def SoftwareAnomaly {
        attribute anomalyId : String;
        attribute title : String;
        attribute severityClass : SoftwareSafetyClass;
    }

    // ─── Lifecycle Process Artefacts ─────────────────────────────────────────
    action def SoftwareLifecycleProcess {
        attribute name : String;
        attribute clause : String;          // e.g. "IEC62304:5.1"
    }

    action def SoftwareLifecycleActivity {
        attribute name : String;
        attribute mandatory : Boolean;
    }

    // ─── Work Products (§5.1 plan outputs, §5.8 configuration items) ─────────
    part def SoftwareWorkProduct {
        attribute title : String;
        attribute workProductId : String;
    }

    part def SoftwareDevelopmentPlan :> SoftwareWorkProduct {
        attribute targetSafetyClass : SoftwareSafetyClass;
    }

    part def SOUPEvaluation :> SoftwareWorkProduct {
        attribute soupRef : String;
    }

    part def SoftwareProblemReport :> SoftwareWorkProduct {
        attribute reportId : String;
        attribute severity : SoftwareSafetyClass;
    }

    part def ChangeImpactAssessment :> SoftwareWorkProduct {
        attribute assessmentId : String;
        attribute safetyImpact : Boolean;
    }

    // ─── IEC 62304 Relationships ─────────────────────────────────────────────
    connection def GovernsActivity {
        end process : SoftwareLifecycleProcess [1];
        end activity : SoftwareLifecycleActivity [1];
    }

    connection def ProducesWorkProduct {
        end activity : SoftwareLifecycleActivity [1];
        end workProduct : SoftwareWorkProduct [1];
    }
}
